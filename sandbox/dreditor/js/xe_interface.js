if (!window.xe) xe = {};

xe.Editors = [];

function editorStart_xe(editor_sequence, primary_key, content_key, editor_height, colorset, content_style, content_font, content_font_size) {
	if(typeof(colorset)=='undefined') colorset = 'white';
	if(typeof(content_style)=='undefined') content_style = 'xeStyle';
	if(typeof(content_font)=='undefined') content_font= '';
	if(typeof(content_font_size)=='undefined') content_font_size= '';

	var target_src = request_uri+'modules/editor/styles/'+content_style+'/editor.html';

	var form = jQuery('#dreditor_dummy_'+editor_sequence).get(0).form;
	form.setAttribute('editor_sequence', editor_sequence);

	// create an editor
	var oEditor = new xe.DrEditor(editor_sequence);
	var content = form[content_key].value;

	form[content_key].value = content;
	
	// register writers
    oEditor.setFont(content_font, content_font_size);
    oEditor.addWriter(xe.DrEditor.hxWriter);
	oEditor.addWriter(xe.DrEditor.txtWriter);
	oEditor.addWriter(xe.DrEditor.imgWriter);
	oEditor.addWriter(xe.DrEditor.linkWriter);
	oEditor.addWriter(xe.DrEditor.listWriter);
	oEditor.addWriter(xe.DrEditor.blockquoteWriter);
	oEditor.addWriter(xe.DrEditor.movWriter);
	oEditor.addWriter(xe.DrEditor.fileWriter);
	oEditor.addWriter(xe.DrEditor.hrWriter);
	oEditor.addWriter(xe.DrEditor.indexWriter);
	oEditor.addWriter(xe.DrEditor.materialWriter);

	// Set standard API
	editorRelKeys[editor_sequence] = new Array();
	editorRelKeys[editor_sequence]["primary"]   = form[primary_key];
	editorRelKeys[editor_sequence]["content"]   = form[content_key];
	editorRelKeys[editor_sequence]["func"]	    = editorGetContentTextarea_xe;
	editorRelKeys[editor_sequence]["editor"]	= oEditor;
	editorRelKeys[editor_sequence]["pasteHTML"] = function(sHTML){
		oEditor.setContent(sHTML);
	}
	xe.Editors[editor_sequence] = oEditor;
	
	oEditor.setContent(content);

    if(typeof(form._disable_autosaved)!="undefined"){
		editorRemoveSavedDoc();
	}else{
		// saved document(자동저장 문서)에 대한 확인
		if(typeof(form._saved_doc_title)!="undefined" ) { ///<< _saved_doc_title field가 없으면 자동저장 하지 않음
			var saved_title = form._saved_doc_title.value;
			var saved_content = form._saved_doc_content.value;
			if(saved_title || saved_content) {
				// 자동저장된 문서 활용여부를 물은 후 사용하지 않는다면 자동저장된 문서 삭제
				if(confirm(form._saved_doc_message.value)) {
					if(typeof(form.title)!='undefined') form.title.value = saved_title;
					setTimeout(function(){
							setContent(editor_sequence,saved_content);
							}, 100);
				} else {
					editorRemoveSavedDoc();
				}
			}

			editorEnableAutoSave(form, editor_sequence);
		}

	}
	return oEditor;
}

function editorGetContentTextarea_xe(editor_sequence) {
	var oEditor = xe.Editors[editor_sequence] || null;

	if (!oEditor) return '';

	return oEditor.getContent();
}

function editorGetIframe(srl) {
	return jQuery('iframe#editor_iframe_'+srl).get(0);
}

function editorReplaceHTML(iframe_obj, content) {
}
function setContent(editor_sequence,content){
	try {
		var editor = editorRelKeys[editor_sequence]["editor"];
		editor.setContent(content);
	} catch(e) {
		setTimeout(function(){
		editor.setContent(content);
		}, 100);

	}
}
