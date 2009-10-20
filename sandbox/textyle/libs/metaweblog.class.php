<?php
    class metaWebLog {
        var $url = null;
        var $user_id = null;
        var $password = null;
        var $blogid = null;

        function metaWebLog($url, $user_id = null, $password = null) {
            if(!preg_match('/^(http|https)/i',$url)) $url = 'http://'.$url;
            $this->url = $url;
            $this->user_id = $user_id;
            $this->password = $password;
        }

        function getUsersBlogs() {
            $oXmlParser = new XmlParser();
            
            $input = sprintf(
                '<?xml version="1.0" encoding="utf-8" ?><methodCall><methodName>blogger.getUsersBlogs</methodName><params><param><value><string>%s</string></value></param><param><value><string>%s</string></value></param><param><value><string>%s</string></value></param></params></methodCall>',
                'textyle',
                $this->user_id,
                $this->password
            );
            $output = $this->_request($this->url, $input, 'application/octet-stream','POST', array(), array(), array('timeout'=>1, 'readTimeout'=>array(1,0)));

            $xmlDoc = $oXmlParser->parse($output);

            if(isset($xmlDoc->methodresponse->fault)) {
                $code = $xmlDoc->methodresponse->fault->value->struct->member[0]->value->int->body;
                $message = $xmlDoc->methodresponse->fault->value->struct->member[1]->value->string->body;
                return new Object($code, $message);
            } 

            $val = $xmlDoc->methodresponse->params->param->value->array->data->value->struct->member;
            $output = new Object();
            $output->add('url', $val[0]->value->string->body?$val[0]->value->string->body:$val[0]->value->body);
            $output->add('blogid', $blogid = $val[1]->value->string->body?$val[1]->value->string->body:$val[1]->value->body);
            $output->add('name', $val[2]->value->string->body?$val[2]->value->string->body:$val[2]->value->body);
            return $output;
        }

        function getCategories() {
            $oXmlParser = new XmlParser();

            $output = $this->getUsersBlogs();
            if(!$output->toBool()) return array();
            $this->blogid = $output->get('blogid');
            
            $input = sprintf(
                '<?xml version="1.0" encoding="utf-8" ?><methodCall><methodName>metaWeblog.getCategories</methodName><params><param><value><string>%s</string></value></param><param><value><string>%s</string></value></param><param><value><string>%s</string></value></param></params></methodCall>',
                $this->blogid,
                $this->user_id,
                $this->password
            );
            $output = $this->_request($this->url, $input, 'application/octet-stream','POST', array(), array(), array('timeout'=>1, 'readTimeout'=>array(1,0)));

            $xmlDoc = $oXmlParser->parse($output);

            if(isset($xmlDoc->methodresponse->fault)) {
                $code = $xmlDoc->methodresponse->fault->value->struct->member[0]->value->int->body;
                $message = $xmlDoc->methodresponse->fault->value->struct->member[1]->value->string->body;
            } 

            $val = $xmlDoc->methodresponse->params->param->value->array->data->value;
            if(!is_array($val)) $list[] = $val;
            else $list = $val;

            $categories = array();
            for($i=0,$c=count($list);$i<$c;$i++) {
		$category = trim($list[$i]->struct->member[1]->value->string->body);
		if(!$category) $category = trim($list[$i]->struct->member[2]->value->string->body);
		if(!$category) $category = trim($list[$i]->struct->member[1]->value->body);
                if(!$category) continue;
                $categories[] = $category;
            }
            return $categories;
        }

        function newMediaObject($filename, $source_file) {
            $oXmlParser = new XmlParser();
            if(preg_match('/\.(jpg|gif|jpeg|png)$/i',$filename)) {
                list($width, $height, $type, $attrs) = @getimagesize($source_file);
                switch($type) {
                    case '1' :
                        $type = 'image/gif';
                        break;
                    case '2' :
                        $type = 'image/jpeg';
                        break;
                    case '3' :
                        $type = 'image/png';
                        break;
                    case '6' :
                        $type = 'image/bmp';
                        break;
                }
            }

            $input = sprintf('<?xml version="1.0" encoding="utf-8"?><methodCall><methodName>metaWeblog.newMediaObject</methodName><params><param><value><string>%s</string></value></param><param><value><string>%s</string></value></param><param><value><string>%s</string></value></param><param><value><struct><member><name>name</name><value><string>%s</string></value></member><member><name>type</name><value><string>%s</string></value></member><member><name>bits</name><value><base64>%s</base64></value></member></struct></value></param></params></methodCall>',
                $this->blogid,
                $this->user_id,
                $this->password,
                str_replace(array('&','<','>'),array('&amp;','&lt;','&gt;'),$filename),
                $type,
                base64_encode(FileHandler::readFile($source_file))
            );
            $output = $this->_request($this->url, $input,  'application/octet-stream','POST');
            $xmlDoc = $oXmlParser->parse($output);

            if(isset($xmlDoc->methodresponse->fault)) {
                $code = $xmlDoc->methodresponse->fault->value->struct->member[0]->value->int->body;
                $message = $xmlDoc->methodresponse->fault->value->struct->member[1]->value->string->body;
                return new Object($code, $message);
            } 

            $t = $xmlDoc->methodresponse->params->param->value->struct->member;
            if(is_array($t)) $target_file = $t[0]->value->string->body;
            else $target_file = $xmlDoc->methodresponse->params->param->value->struct->member->value->string->body;
            $output = new Object();
            $output->add('target_file',$target_file);
            return $output;

        }

        function newPost($oDocument, $category = null) {
            $oXmlParser = new XmlParser();

            $output = $this->getUsersBlogs();
            if(!$output->toBool()) return $output;
            $this->blogid = $output->get('blogid');

            if($oDocument->hasUploadedFiles()) {
                $file_list = $oDocument->getUploadedFiles();
                if(count($file_list)) {
                    $content = $oDocument->get('content');
                    foreach($file_list as $file) {
                        $output = $this->newMediaObject($file->source_filename, $file->uploaded_filename);
                        $target_file = $output->get('target_file');

                        if(!$target_file) continue;

                        preg_match('/(.+)\/'.preg_quote($file->source_filename).'$/',$file->uploaded_filename, $m);
                        $path = $m[1].'/';
                        $uploaded_filename = $file->uploaded_filename;
                        $encoded_filename = $path.str_replace('+','%20',urlencode($file->source_filename));

                        if(strpos($content, $file->uploaded_filename)!==false) $content = str_replace($file->uploaded_filename, $target_file, $content);
                        if(strpos($content, $encoded_filename)!==false) $content = str_replace($encoded_filename, $target_file, $content);

                        $uploaded_filename = preg_replace('/^\.\//','',$file->uploaded_filename);
                        $encoded_filename = preg_replace('/^\.\//','',$path.str_replace('+','%20',urlencode($file->source_filename)));

                        if(strpos($content, $file->uploaded_filename)!==false) $content = str_replace($file->uploaded_filename, $target_file, $content);
                        if(strpos($content, $encoded_filename)!==false) $content = str_replace($encoded_filename, $target_file, $content);

                    }
                    $oDocument->add('content', $content);
                }
            }

            $input = sprintf('<?xml version="1.0" encoding="utf-8"?><methodCall><methodName>metaWeblog.newPost</methodName><params><param><value><string>%s</string></value></param><param><value><string>%s</string></value></param><param><value><string>%s</string></value></param><param><value><struct><member><name>title</name><value><string>%s</string></value></member><member><name>description</name><value><string>%s</string></value></member><member><name>categories</name><value><array><data><value><string>%s</string></value></data></array></value></member><member><name>tagwords</name><value><array><data><value><string>%s</string></value></data></array></value></member></struct></value></param><param><value><boolean>1</boolean></value></param></params></methodCall>',
                    $this->blogid,
                    $this->user_id,
                    $this->password,
                    str_replace(array('&','<','>'),array('&amp;','&lt;','&gt;'),$oDocument->get('title')),
                    str_replace(array('&','<','>'),array('&amp;','&lt;','&gt;'),$oDocument->get('content')),
                    str_replace(array('&','<','>'),array('&amp;','&lt;','&gt;'),$category),
                    str_replace(array('&','<','>'),array('&amp;','&lt;','&gt;'),$oDocument->get('tags'))
            );
            $output = $this->_request($this->url, $input,  'application/octet-stream','POST');
            $xmlDoc = $oXmlParser->parse($output);

            if(isset($xmlDoc->methodresponse->fault)) {
                $code = $xmlDoc->methodresponse->fault->value->struct->member[0]->value->int->body;
                $message = $xmlDoc->methodresponse->fault->value->struct->member[1]->value->string->body;
                return new Object($code, $message);
            } 
            $postid = $xmlDoc->methodresponse->params->param->value->string->body;
            if(!$postid) $postid = $xmlDoc->methodresponse->params->param->value->i4->body;
            $output = new Object();
            $output->add('postid', $postid);
            return $output;
        }

        function editPost($postid, $oDocument, $category = null) {
            $oXmlParser = new XmlParser();

            $output = $this->getUsersBlogs();
            if(!$output->toBool()) return $output;
            $this->blogid = $output->get('blogid');

            if($oDocument->hasUploadedFiles()) {
                $file_list = $oDocument->getUploadedFiles();
                if(count($file_list)) {
                    $content = $oDocument->get('content');
                    foreach($file_list as $file) {
                        $output = $this->newMediaObject($file->source_filename, $file->uploaded_filename);
                        $target_file = $output->get('target_file');

                        if(!$target_file) continue;

                        preg_match('/(.+)\/'.preg_quote($file->source_filename).'$/',$file->uploaded_filename, $m);
                        $path = $m[1].'/';
                        $encoded_filename = $path.str_replace('+','%20',urlencode($file->source_filename));

                        if(strpos($content, $file->uploaded_filename)!==false) $content = str_replace($file->uploaded_filename, $target_file, $content);
                        if(strpos($content, $encoded_filename)!==false) $content = str_replace($encoded_filename, $target_file, $content);

						$uploaded_filename = preg_replace('/^\.\//','',$file->uploaded_filename);
                        $encoded_filename = preg_replace('/^\.\//','',$path.str_replace('+','%20',urlencode($file->source_filename)));

                        if(strpos($content, $file->uploaded_filename)!==false) $content = str_replace($file->uploaded_filename, $target_file, $content);
                        if(strpos($content, $encoded_filename)!==false) $content = str_replace($encoded_filename, $target_file, $content);
                    }
                    $oDocument->add('content', $content);
                }
            }

            $input = sprintf('<?xml version="1.0" encoding="utf-8"?><methodCall><methodName>metaWeblog.editPost</methodName><params><param><value><i4>%s</i4></value></param><param><value><string>%s</string></value></param><param><value><string>%s</string></value></param><param><value><struct><member><name>title</name><value><string>%s</string></value></member><member><name>description</name><value><string>%s</string></value></member><member><name>categories</name><value><array><data><value><string>%s</string></value></data></array></value></member><member><name>tagwords</name><value><array><data><value><string>%s</string></value></data></array></value></member></struct></value></param><param><value><boolean>1</boolean></value></param></params></methodCall>',
                    $postid,
                    $this->user_id,
                    $this->password,
                    str_replace(array('&','<','>'),array('&amp;','&lt;','&gt;'),$oDocument->get('title')),
                    str_replace(array('&','<','>'),array('&amp;','&lt;','&gt;'),$oDocument->get('content')),
                    str_replace(array('&','<','>'),array('&amp;','&lt;','&gt;'),$category),
                    str_replace(array('&','<','>'),array('&amp;','&lt;','&gt;'),$oDocument->get('tags'))
            );
            $output = $this->_request($this->url, $input,  'application/octet-stream','POST');
            $xmlDoc = $oXmlParser->parse($output);

            if(isset($xmlDoc->methodresponse->fault)) {
                $code = $xmlDoc->methodresponse->fault->value->struct->member[0]->value->int->body;
                $message = $xmlDoc->methodresponse->fault->value->struct->member[1]->value->string->body;
                return new Object($code, $message);
            } 
            $output = new Object();
            $output->add('postid', $postid);
            return $output;
        }


        function _request($url, $body = null, $content_type = 'text/html', $method='GET', $headers = array(), $cookies = array(), $params = array()) {
            set_include_path(_XE_PATH_."libs/PEAR");
            require_once('PEAR.php');
            require_once('HTTP/Request.php');

            $url_info = parse_url($url);
            $host = $url_info['host'];

            if(__PROXY_SERVER__!==null) {
                $oRequest = new HTTP_Request(__PROXY_SERVER__);
                $oRequest->setMethod('POST');
                $oRequest->addPostData('arg', serialize(array('Destination'=>$url, 'method'=>$method, 'body'=>$body, 'content_type'=>$content_type, "headers"=>$headers)));
            } else {
                $oRequest = new HTTP_Request($url,$params);
                if(count($headers)) {
                    foreach($headers as $key => $val) {
                        $oRequest->addHeader($key, $val);
                    }
                }
                if($cookies[$host]) {
                    foreach($cookies[$host] as $key => $val) {
                        $oRequest->addCookie($key, $val);
                    }
                }
                if(!$content_type) $oRequest->addHeader('Content-Type', 'text/html');
                else $oRequest->addHeader('Content-Type', $content_type);
                $oRequest->setMethod($method);
                if($body) $oRequest->setBody($body);
            }

            $oResponse = $oRequest->sendRequest();

            $code = $oRequest->getResponseCode();
            $header = $oRequest->getResponseHeader();
            $response = $oRequest->getResponseBody();
            if($c = $oRequest->getResponseCookies()) {
                foreach($c as $k => $v) {
                    $cookies[$host][$v['name']] = $v['value'];
                }
            }
            if($code > 300 && $code < 399 && $header['location']) {
                return $this->_request($header['location'], $body, $content_type, $method, $headers, $cookies);
            }

            if($code != 200) return;

            return $response;
        }

    }
?>
