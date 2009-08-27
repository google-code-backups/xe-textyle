<?php
    /**
     * @class  materialModel
     * @author sol (sol@ngleader.com)
     * @brief  material 모듈의 Model class
     **/

    class materialModel extends material {

        /**
         * @brief 초기화
         **/
        function init() {
        }


        /**
         * @brief Material 목록 return
         **/
		function getMaterialList($obj){
            if(!in_array($obj->sort_index, array('material_srl'))) $sort_index = 'material_srl';
            $args->module_srl = $obj->module_srl;
			
			if(!$obj->member_srl){
				$logged_info = Context::get('logged_info');
				$obj->member_srl = $logged_info->member_srl;
			}
			
			$args->member_srl = $obj->member_srl;
            $args->sort_index = $obj->sort_index;
            $args->list_count = $obj->list_count ? $obj->list_count : 20;
            $args->page = $obj->page ? $obj->page : 1;
            $output = executeQueryArray('material.getMaterialList', $args);

            return $output;
        }

        /**
         * @brief Material return
         **/
        function getMaterial($material_srl=0) {
            $args->material_srl = $material_srl;
            $output = executeQueryArray('material.getMaterial', $args);

            return $output;
        }

        /**
         * @brief Material member_srl return
         **/
		function getMemberSrlByAuth($auth){
			$args->auth = $auth;
			$output = executeQuery('material.getMaterialAuth',$args);
			if($output->data) return $output->data->member_srl;
			else return null;
		}


        /**
         * @brief Material Auth return
         **/
		function getAuthByMemberSrl($member_srl){
			$args->member_srl = $member_srl;
			$output = executeQuery('material.getMaterialAuth',$args);
			if($output->data) return $output->data->auth;
			else return null;
		}

        /**
         * @brief bookmark url return 
         **/
		function getBookmarkUrl($vid, $member_srl) {
			if(!$member_srl) return '';

			$html_url = str_replace('&amp;','&',getFullSiteUrl($vid,'','module','material','act','dispMaterialPopup'));
			$js_url = Context::getRequestUri().'modules/material/tpl/js/material_grabber.js';

			$auth = $this->getAuthByMemberSrl($member_srl);

			if(!$auth){
				$oMaterialController = &getController('material');
				$output = $oMaterialController->insertMaterialAuth($member_srl);
				$auth = $this->getAuthByMemberSrl($member_srl);
			}
//$bookmark_url="javascript:(function(){var ifm,w=window,d=document,s=d.createElement('script'),ie=('\v'=='v');if((ifm=d.getElementsByName('XE_materialGrabWin')) && ifm.length>0){ifm=ifm[0];ifm.setAttribute('src','');}else{if(ie){ifm=d.createElement('<iframe src=\'\' name=\'XE_materialGrabWin\' allowtransparency=\'true\' frameborder=\'0\' style=\'position:absolute;top:0;right:0;width:640px;height:450px;z-index:10000;\'></iframe>');}else{ifm=d.createElement('iframe');ifm.setAttribute('allowtransparency','true');ifm.setAttribute('name','XE_materialGrabWin');ifm.setAttribute('frameborder','0');ifm.style.position='absolute';ifm.style.top='0';ifm.style.right='0';ifm.style.width='650px';ifm.style.height='430px';ifm.style.zIndex='10000';}d.body.appendChild(ifm);}s.setAttribute('src','".$js_url."');w.__xe_auth='".$auth."';w.__xe_root='".$html_url."';d.body.appendChild(s);})();";

			$bookmark_url = "javascript:(function(){var w=window,d=document,x=w.open('about:blank','XE_materialGrabWin','width=300,height=0,location=0,scrollbars=0,toolbar=0,status=0,menubar=0,resizable'),s=d.createElement('script');s.setAttribute('src','".$js_url."');w.auth='".$auth."';w.__xe_root='".$html_url."';d.body.appendChild(s);w.setTimeout(function(){x.focus()},100);})();";
			return $bookmark_url;
		}

   }
?>
