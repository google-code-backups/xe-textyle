// extends jQuery object
(function($){$.extend({Class:function(def){function c(){if(typeof this.$super!='undefined')this.$super.$this=this;this.$init.apply(this,arguments)}if(!def.$init)def.$init=function(){};c.prototype=def;c.constructor=c;c.extend=Class_extend;return c;},$:function(id){if(typeof id=='string'){if(id.substring(0,1)=='<')return $(id).get(0);return $('#'+id).get(0);}else{return id;}},fnBind:function(fn,th){var args=$.makeArray(arguments);args.shift();args.shift();return function(){var a=args.concat($.makeArray(arguments));return fn.apply(th,a);};}});$.browser.nVersion=parseFloat($.browser.version);function Class_extend(superDef){var Super=superDef.prototype;this.prototype.$super={};function bind(fn){return function(){return fn.apply(this.$this,arguments)}};for(var x in Super){if(!Super.propertyIsEnumerable(x)||x=='$init')continue;if(typeof this.prototype[x]=='undefined')this.prototype[x]=Super[x];this.prototype.$super[x]=$.isFunction(Super[x])?bind(Super[x]):Super[x]};var f=this.prototype.$init,sf=Super.$init;this.prototype.$init=function(){var a=$.makeArray(arguments);sf.apply(this,a);f.apply(this,a)};return this}})(jQuery);

(function($){
if (typeof window.xe == 'undefined') window.xe = {};

// 에디터 스킨용 자바스크립트
xe.DrEditor = $.Class({
	writers   : {},
	container : null,
	editArea  : null,
	writeArea : null,
	dummyArea : null,
	toolbar   : null,
	blankBox  : null,
	material  : null,
	dragging  : false,
	fontFamily: null,
	fontSize  : null,
	handlers  : {},
	writer :null,
	cur_focus : null,

	$init : function(editor_sequence) {
		var self = this;
		var ctn  = this.container = $('div#DrEditor'+editor_sequence);
		var edt  = this.editArea  = ctn.find('>div>div.editorArea');
		var wrt  = this.writeArea = ctn.find('>div>div.writeArea');
		var mtr  = this.material  = ctn.find('>div.keepingArea');
		var dum  = this.dummyArea = $('<div class="dummy" style="display:none">').appendTo(wrt);

		// BlankBox = 글이 없을 때 보여주는 글상자
		this.blankBox = wrt.find('>div.blank').appendTo(edt);

		// 편집기 시퀀스 저장
		this.seq = editor_sequence;

		// 글감 보관함 사이드바 토글
		var btnToggle    = ctn.find('button.toggle');
		var keepSections = ctn.find('.keepingArea .section');
	
		btnToggle.click(function(){ 
			if(!$(this).parents('.section').hasClass('open')){
				$(this).parents('.section').addClass('open');
				ctn.removeClass('keepClose');
				$(this).parents('form').addClass('dreditorKeepOn');

				var expire = new Date();
				expire.setTime(expire.getTime()+ (7000 * 24 * 3600000));
				xSetCookie('showMaterial', 1, expire);

			}
		});
		ctn.find('button.collapse').click(function(){ 
			ctn.addClass('keepClose'); 
			keepSections.removeClass('open'); 
			$(this).parents('form').removeClass('dreditorKeepOn');

			var expire = new Date();
			expire.setTime(expire.getTime()+ (7000 * 24 * 3600000));
			xSetCookie('showMaterial', -1, expire);

		});

		ctn.find('button.reload').click(function(){ self.loadMaterial()});

		var showMaterial = xGetCookie('showMaterial');
		if(showMaterial==-1) ctn.find('button.collapse').click();


		// 편집 이벤트 핸들러
		this.$onParaEdit   = $.fnBind(this.onParaEdit, this);
		this.$onParaDelete = $.fnBind(this.onParaDelete, this);
		this.$onParaMoving = $.fnBind(this.onParaMoving, this);
		this.$onParaMoveEnd = $.fnBind(this.onParaMoveEnd, this);

		// 편집도구
		var etool = wrt.find('ul.eTool');
		var tools = this.tools = etool.prev().nextAll().clone();
		this.dummyArea.append(tools);
		etool.remove();

		// 하단 버튼
		this.toolbar = wrt.find('>.wToolbarContainer>div.wToolbar').css('position', 'relative');
		this.toolbar.find('button').click(function(e){ self.onTBClick(e, this); }).mouseover(function(){$(this).parent().addClass('hover');}).mouseout(function(){$(this).parent().removeClass('hover')});
		this.toolbar.find('li.more button').click(function(e){
			var wtc = $(this).parents('div.wToolbarContainer');
			var isExpand = wtc.hasClass('more');

			if (isExpand) {
				wtc.removeClass('more');
			}else{
				wtc.addClass('more');
			}

			self.notify('MORE', [!isExpand]);
		});

		// 스크롤 이벤트 캡쳐
		var scrollTimer = null;
		$(window).scroll(function(){
			if (scrollTimer) clearTimeout(scrollTimer);
			scrollTimer = setTimeout(function(){
				scrollTimer = null;
				self.notify('SCROLL')
			}, 50);
		});
		// 이미지를 다 읽어들이면 강제로 스크롤 이벤트 발생
		$(window).load(function(){ self.notify('LOAD'); });

		// Notify 핸들러
		this.regNotifyHandler(this);

		// 편집도구 보이기 / 가리기
		//edt.mouseover($.fnBind(this.onParaMouseOver,this)).mouseleave($.fnBind(this.onParaMouseLeave,this)).dblclick($.fnBind(this.onParaDblclick,this));
		edt.click($.fnBind(this.onParaClick,this)).blur($.fnBind(this.onParaOut,this)).dblclick($.fnBind(this.onParaDblclick,this));

		$(document).keydown($.fnBind(this.onkeydown,this)).click(function(e){
			if(!$(e.target).is('div.eArea') && $(e.target).parents('div.eArea').length==0) self.onParaOut();
		});

		// 단락 Sortable Drag & Drop
		this.editArea.sortable({
			items : '> div.eArea',
			opacity : 0.8,
			placeholder: 'xe_dr_placeholder',
			handle : 'li.move > button',
			axis   : 'y',
			cursor : 'default',
			cancel : 'input'
		}).bind('sortreceive', function(event,orgEvent,ui) {
			var img = ui.item.find('dd>div.xe_dr_img img');
			if(img.size()>0){
				var tmp_img = $('<img>').attr('src',img.attr('src').replace(/(\.S)(\.[^\.]*)$/,'$2')).load(function(){
					$(this).attr({
						width : this.width
						,height : this.height
					}).replaceAll(img);
				});

			}
			var mov = ui.item.find('dd>div.xe_dr_mov object');
			if(mov.size()>0){
				mov.attr({width:mov.attr('_width'),
						height:mov.attr('_height')});
				mov.find('embed').attr({width:mov.attr('_width'),
						height:mov.attr('_height')});
			}

			ui.item.before(ui.item.find('dd>div.eArea')).remove();
			self.editArea.find('>div.eArea').addClass('xe_content');
			self.notify('SORT_RECEIVE', [ui]);
		})
		.bind('sortupdate', function(event,orgEvent,ui){
		 })
		.bind('sortstart', function(){ 
			 self.dragging = true;
			 self.notify('SORT_START');
		 })
		.bind('sortstop',  function(event,orgEvent,ui){ 
			self.dragging = false;
			self.notify('SORT_STOP', [ui]);
		});

		// 단락 타입버튼 Sortable
		wrt.find('>.wToolbarContainer>div.wToolbar ul').sortable({
			items : '>li',
			handle : '.dragable',
			opacity : 0.8
		}).bind('sortstop',  function(event,orgEvent,ui){
			var serial = [];
			$(this).find('>li').each(function(i){
				var css = $.trim($(this).attr('class').replace('hover',''));
				if(css!='more') serial.push(css);
			});
			var expire = new Date();
			expire.setTime(expire.getTime()+ (7000 * 24 * 3600000));
			xSetCookie('DrEditorToolbar', serial.join(','), expire);

		}); 

		// 글감 보관함 드래그&드롭 설정, 핸들러
		this._dragOption = {
			helper  : 'clone',
			cancel  : 'input',
			handle  : 'button.movable',
			opacity : 0.8,
			start   : function(event,orgEvent,ui){ self.editArea.sortable('refreshPositions') },
			connectToSortable : this.editArea.selector
		};

		// 글감 보관함 컨텐트 읽어오기
		this.matTpl = this.material.find('div.keepList:first > div.item:first').remove(); // 템플릿을 미리 떼놓는다.
		this.loadMaterial();

		// 임시 저장 목록 읽어오기
//		this.tmpTpl = this.material.find('div.keepList:last > div.item:first').remove(); // 템플릿
		//this.loadTempSaving();

		this.hidden_content=self.getContent();

		window.onbeforeunload = function(e){
			if(self.hidden_content != self.getContent()){
				var msg = editorRelKeys[self.seq]["primary"].form.msg_close_before_write.value;
				var ie = ('\v'=='v');
				if(!ie){
					return msg;
				}else{
					window.event.returnValue = msg;
				}
			}
		}

		// submit 체크
		var frm = ctn.parents('form');
		var fn  = frm[0].onsubmit;

		frm[0].onsubmit = function(e){ return self.onFormSubmit(e || window.event, fn) };
	},

	loadMaterialNext : function(){
		if(++this.next_page>=this.total_page) this.next_page=this.total_page;
		this.next_page = this.next_page>0?this.next_page:1;
		this.loadMaterial(this.next_page);

	},

	loadMaterialPrev : function(){
		this.prev_page = --this.prev_page>0?this.prev_page:1;
		this.loadMaterial(this.prev_page);
	},

	// 글감 보관함 불러오기
	loadMaterial : function(page) {
		var self = this;
		var area = this.material.find('div.keepList:first');

		if (!page) page = 1;

		function callback(data){
            if(data.page_navigation.total_count) jQuery('.keepList.noData').css('display','none');

			// 글감 목록 전부 삭제
			area.children('div.item').remove();

			// 페이징
			var paginate = area.find('div.paginate');
			paginate.find('> span').text(data.page_navigation.cur_page+'/'+data.page_navigation.total_page);

			self.prev_page = data.page_navigation.cur_page;
			self.next_page = data.page_navigation.cur_page;
			self.total_page = data.page_navigation.total_page;
			
			//paginate.find('> button.prev').unbind('click',$.fnBind(self.loadMaterialPrev,self)).bind('click',$.fnBind(self.loadMaterialPrev,self));
			//paginate.find('> button.next').unbind('click',$.fnBind(self.loadMaterialNext,self)).bind('click',$.fnBind(self.loadMaterialNext,self));
			
			if(!self.loaded){
				paginate.find('> button.prev').bind('click',$.fnBind(self.loadMaterialPrev,self));
				paginate.find('> button.next').bind('click',$.fnBind(self.loadMaterialNext,self));
			}

			// 컨텐트 추가
			$.each(data.material_list, function(){
				var tpl = self.matTpl.clone();

				tpl.addClass('xe_dr_'+this.type);
				tpl.find('dt').text(this.regdate.substring(0,4)+'.'+this.regdate.substring(4,6)+'.'+this.regdate.substring(6,8)+' '+this.regdate.substring(8,10)+':'+this.regdate.substring(10,12));
				tpl.find('dd').html(this.content);
				var img = tpl.find('img');

				if(img.size()>0){
					$('<img>').attr('src',img.attr('src').replace(/(\.[^\.]*)$/,'.S$1')).replaceAll(img);
				}

				var ob = tpl.find('dd>div.xe_dr_mov>object, dd>div.xe_dr_mov object embed');
				var w=ob.attr('width');
				var h=ob.attr('height');
				if(w>188){
					ob.attr({_width:w,_height:h,width:188,height:parseInt(h*(188/w))});
				}
				paginate.before(tpl);
			});

			if (!self.$onMateMouseEnter) self.$onMateMouseEnter = $.fnBind(self.onMateMouseEnter,self);
			if (!self.$onMateMouseLeave) self.$onMateMouseLeave = $.fnBind(self.onMateMouseLeave,self);

			area.find('>div.item')
				.mouseenter(self.$onMateMouseEnter)
				.mouseleave(self.$onMateMouseLeave)
				.draggable(self._dragOption)
				.bind('dragstart',self._dragOption.start);

			self.loaded =true;
		}

		if(jQuery('.keepingArea').length) $.exec_json('material.dispMaterialList',{page:page, list_count:4},callback);
	},

	// 임시저장 목록 불러오기
	loadTempSaving : function(page) {
		var self = this;
		var area = this.material.find('div.keepList:last');

		if (!page) page = 1;

		function callback(data) {
			// 임시 저장 목록 삭제
			area.children('div.item').remove();

			// 페이징
			var paginate = area.find('div.paginate');
			paginate.find('> span').text(data.page_navigation.cur_page+'/'+data.page_navigation.total_page);

			// 컨텐트 추가
			$.each(data.document_list, function(){
				var tpl = self.tmpTpl.clone();

				tpl.find('dt').text(this.regdate);
				tpl.find('dd > h3').text(this.title);
				tpl.find('dd > p').html(this.content);
				tpl.find('img').attr({width:188});

				paginate.before(tpl);
			});
		}

		$.exec_json('member.dispSavedDocumentList',{page:page, list_count:5},callback);
	},

	createContentFromMaterial : function(obj) {
		var div = $('<div class="eArea xe_content"></div>');
		var cls = obj.attr('class').match(/xe_dr_([a-z]+)/);
		var ctn = obj.find('dd');

		if (!cls) cls = ['xe_dr_txt','txt'];

		ctn.find('img').removeAttr('width');

		return div.html(ctn.html()).addClass(cls[0]);
	},

	getContent : function() {
		var aContent = [];

		// 일단 도구들을 옮긴다.
		this.dummyArea.append(this.tools);

		this.editArea.find('> div.eArea').each(function(){
            if(!/(^|\s)xe_dr_[a-z]+(\s|$)/.test(this.className)) return;
			var t,html='', type = $.trim(this.className.match(/(^|\s)xe_dr_[a-z]+(\s|$)/)[0]);
			if((t=$(this)).is('div.xe_dr_img')){
				t=t.find('img');
				t.attr({width:t.attr('_width'),height:t.attr('_height')}).removeAttr('_width').removeAttr('_height');
			}
			switch(type){
				/*
				case'xe_dr_file':
					break;
				case'xe_dr_hr':
					break;
				*/
				default:
					html = '<div class="eArea xe_content '+type+'">'+$(this).html()+'</div>';
					break;
			}

			aContent.push(html);
		});

		return aContent.join('');
	},

    setFont : function(fontFamily, fontSize) {
        this.fontFamily = fontFamily;
        this.fontSize = fontSize;
    },

	setContent : function(sContent) {
		var self    = this;
		var unknown = null;
		var div	     = $('<div>');
		var nodes   = $('<div class="eArea xe_content"></div>'+sContent);

		/**
		 * nodes에서 <div>를 앞에 추가한 이유.
		 * 텍스트만 있으면 노드로 만들어지지 않기 때문에, 더미 노드를 앞에 넣어 텍스트 노드가 사라지지 않도록 한다.
		 */
		var content = [];
		nodes.slice(1).each(function(){
			var t = $(this), d = $('<div class="eArea xe_content">');

			if (this.nodeType != 1 && this.nodeType != 3) return;

			if (this.nodeType != 3 && !t.is('div.eArea,img,blockquote,object,embed,h3,h4,h5,p')) {
				// 알 수 없는 타입의 컨텐트는 죄다 unknown에 몰아둔다.(unknown은 텍스트 문단으로 취급)
				if (!unknown) unknown = $('<div class="eArea xe_content xe_dr_txt">');
				unknown.append(this);
			} else if (unknown) {
				content.push(unknown);
				unknown = null;
			}

			if (this.nodeType == 3) {
				d.addClass('xe_dr_txt').append($('<p>').text(this.nodeValue));
			} else if (t.is('div.eArea')) {
				d = t;
			} else if (t.is('p')) {
				d.append(t).addClass('xe_dr_txt');
			} else if (t.is('h3,h4,h5')) {
				d.append(t).addClass('xe_dr_hx');
			} else if (t.is('img')) {
				d.append($('<p>').append(t)).addClass('xe_dr_img');
			} else if (t.is('blockquote')) {
				d.append(t).addClass('xe_dr_blockquote');
			} else if (t.is('object,embed')) {
				d.append(t).addClass('xe_dr_mov');
			}

			content.push(d);
		});

		this.blankBox.remove();
		this.editArea.empty();
		$.each(content,function(){ self.editArea.append(this) });

		if (!content.length) this.editArea.append(this.blankBox);
	},

	notify : function(msg, args){
		var h = this.handlers;

		msg = msg.toUpperCase();
		if (!h[msg] || !h[msg].length) return false;

		var i, len = h[msg].length;
		for(i=0; i < len; i++) {
			h[msg][i][0].apply(h[msg][i][1], args || []);
		}

		return true;
	},

	addWriter : function(writer) {
		if (!writer || !writer.prototype.name) return false;

		writer = new writer(this.writeArea, this);
        writer.setFont(this.fontFamily, this.fontSize);

		this.writers[writer.name] = writer;
		this.regNotifyHandler(writer);
	},

	regNotifyHandler : function(obj) {
		var rx  = /^\$ON_(\w+)$/, e;
		for(var m in obj) {
			if (rx.test(m)) {
				e = RegExp.$1.toUpperCase();
				if (typeof this.handlers[e] == 'undefined') this.handlers[e] = [];
				this.handlers[e].push([obj[m], obj]);
			}
		}
	},

	// 하단 툴바 버튼 클릭
	onTBClick : function(e, sender) {
		var btn  = $(sender);
		var type = $.trim(btn.parent().attr('class').replace('hover',''));

		if (!this.writers[type]) return;

		this.writers[type].reset();
		if (this.cur_focus) {
			this.writers[type].showNext();
		} else {
			this.writers[type].show();
		}
		this.scrollIntoView(this.writers[type].toObject());
	},

	onParaClick : function(e) {
		this.onParaOut();

		if (this.dragging) return;
		if (this.writer) return;
		var obj;
		if(e){
			obj = $(e.target).parents().andSelf().filter('div.eArea');
		}else{
			obj=this.cur_focus;
		}
		var par = this.tools.parent('div.eArea');

		if (!obj.length) return;

		if (par.get(0) === obj.get(0)) return;
		this.editArea.find('.eFocus').removeClass('eFocus');
		obj.addClass('eFocus').append(this.tools);
		this.cur_focus = obj;


		// 이벤트를 해제 후 재할당 - sort 할 때 이벤트가 사라지는 버그 때문
		var sEvent = $.browser.msie?'mouseup':'click';

		this.tools.find('li.edit > button').unbind(sEvent, this.$onParaEdit).bind(sEvent, this.$onParaEdit);
		this.tools.find('li.delete > button').unbind(sEvent, this.$onParaDelete).bind(sEvent, this.$onParaDelete);

		// 단락이 선택됐음을 알리는 메시지
		this.notify('SELECT_PARAGRAPH', [obj.attr('_key_action')?true:false]);
	},
	onParaDblclick : function(e) {
		if(this.writer) return;
		var obj = $(e.target).parents('div.eArea');
		if(obj.length==0) return;		
		this.onParaEdit(e);
	},

	onParaOut : function(e) {
		//if (e && $.browser.msie && $(e.toElement).is('div.editorContainer')) return;
		this.tools.parent().removeClass('eFocus');
		this.dummyArea.append(this.tools);
		this.cur_focus = null;
	},

	onParaEdit : function(e) {
		var type, eArea = e?this.tools.parent('div.eArea'):this.cur_focus;
		eArea.removeClass('eFocus');
		type = /xe_dr_(\w+)/.test(eArea.attr('class'))?RegExp.$1:'txt';
		if (this.writers[type]) {
			this.writers[type].reset();
			this.writers[type].show(eArea);
		}
	},

	onParaDelete : function(e) {
		var eArea;
		if(e) eArea=this.tools.parent('div.eArea');
		else{
			if(confirm(delete_dr_confirm_msg)) eArea=this.cur_focus;
			else return;
		}
		var type = /xe_dr_(\w+)/.test(eArea.attr('class'))?RegExp.$1:'txt';

		this.dummyArea.append(this.tools);
		eArea.remove();

		this.notify('DEL_CONTENT', [type]);
		this.cur_focus = null;
	},

	onMateMouseEnter : function(e) {
		$(e.currentTarget).addClass('hover');
	},

	onMateMouseLeave : function(e) {
		$(e.currentTarget).removeClass('hover');
	},
	onkeydown : function(e) {
		if(typeof(e.keyCode) !='undefined'){
			var eArea = this.editArea.find('>div.eArea');
			
			// not editing mode
			if(!this.writer){
				// up /down
				//if(!$(e.srcElement?e.srcElement:e.originalTarget).is('input,textarea') && ( e.keyCode == 38||e.keyCode==40) ){
				if( e.keyCode == 38||e.keyCode==40 ){
					if(e.ctrlKey){
						if(!this.cur_focus || this.cur_focus.length==0) return;
						this.cur_focus[e.keyCode==38?'prev':'next']()[e.keyCode==38?'before':'after'](this.cur_focus);
	
						this.notify('SORT_STOP');
						this.notify('MOVE_PARAGRAPH');
					}else{
						if(e.keyCode ==38){
							if(this.cur_focus && this.cur_focus.length>0){
								var p = this.cur_focus.prev();
								if(p.length>0) this.cur_focus = p;
							}else {
								this.cur_focus = eArea.eq(eArea.length-1);
							}
						}else{
							if(this.cur_focus && this.cur_focus.length>0){
								var n = this.cur_focus.next();
								if(n.length>0) this.cur_focus = n;
							}else {
								this.cur_focus = eArea.eq(0);
							}
						}
						this.cur_focus.attr('_key_action', true).click().removeAttr('_key_action');
					}

//					this.notify('');

					return false;

				// 1~9,0 key	
				}else if(e.keyCode>=48 && e.keyCode<=58){
					if( !this.writer && !$(e.target).is('input,textarea')){
						var writer_index = e.keyCode-49==-1?9:e.keyCode-49;
						var writer_name = this.writeArea.find('>.wToolbarContainer>div.wToolbar li').eq(writer_index).attr('class');
						if(writer_name && this.writers[writer_name]){
							if(this.cur_focus && this.cur_focus.length>0){
								this.writers[writer_name].reset();
								this.writers[writer_name].showNext();
								return false;
							}else{
								this.writers[writer_name].reset();
								this.writers[writer_name].show();
								return false;
							}
						}
					}

				// enter
				}else if(e.keyCode==13){
					if(!$(e.srcElement?e.srcElement:e.originalTarget).is('input,textarea') && this.cur_focus && this.cur_focus.length>0){
						this.onParaEdit();
						return false;
					}
				// delete
				}else if(!$(e.srcElement?e.srcElement:e.originalTarget).is('input,textarea,button') && e.keyCode==46){
					if(this.cur_focus && this.cur_focus.length>0){
						var cur_focus;
						if(this.cur_focus.next().length>0){
							cur_focus = this.cur_focus.next();
						}else if(this.cur_focus.prev().length>0){
							cur_focus = this.cur_focus.prev();
						}

						this.onParaDelete();
						if((this.cur_focus = cur_focus) && this.cur_focus.length>0) this.cur_focus.click();
						
						return false;
					}
				}
			}

		}
	},

	onFormSubmit : function(e, fn) {
		// 열려있는 편집기 모듈이 있는지 확인
		if (this.container.find('div.wArea').filter('.open').length) {
			// 열려있는 모듈이 있다는 경고 표시
			if (!confirm(submit_without_saving_msg)) return false;
		}

		var bool = true;
		if (typeof fn == 'function') bool = fn.apply(e.srcElement || e.target);

		return bool;
	},
	
	// DocType이 XHTML Transitional이 아니라면 높이를 계산하는 과정에서 문제가 발생할 수 있습니다.
	scrollIntoView : function(obj) {
		if (!obj) return false;

		var oDoc  = document.documentElement;
		var docHeight  = oDoc.clientHeight;
		var objHeight  = obj.outerHeight();
		var toolHeight = obj.find('ul.eTool').height() || 0;
		var tbHeight   = this.toolbar.height();
		var offsetTop  = parseInt(obj.offset().top);
		var offsetBot  = offsetTop + objHeight;
		var viewTop    = $(window).scrollTop();
		var viewBottom = viewTop + docHeight - tbHeight;
		
		// 정상적인 경우는 리턴
		if (((offsetTop - toolHeight) >= viewTop) && (offsetBot <= viewBottom)) return true;

		// 위치 조정
		if ((offsetTop - toolHeight) < viewTop) {
			$(window).scrollTop( Math.max(offsetTop - toolHeight, 0) );
		} else {
			$(window).scrollTop( Math.min(offsetBot - docHeight + tbHeight + 10, Math.max(offsetTop - toolHeight, 0) ) );
		}

		this.notify('SCROLL');
	},

	// 툴바의 위치가 항상 화면 하단에 있도록 재조정
	toolbarRepos : function() {
		var oDoc  = document.documentElement;
		var docHeight  = oDoc.clientHeight;
		var tbBox      = this.toolbar.parent();
		var tbHeight   = tbBox.height();
		var scrollTop  = $(window).scrollTop();
		var viewBottom = scrollTop + docHeight;
		var offsetTop  = 0;
		var oldTop     = tbBox.css('top');

		tbBox.css('top', 0);
		offsetTop = tbBox.offset().top;

		// bottom of screen view
		var newTop = ((viewBottom - tbHeight) - offsetTop - 5);

		// 툴바의 위치는 문서의 범위를 넘지 않는다.
		newTop = Math.min(newTop, 0)+'px';

		if (oldTop != newTop) {
			tbBox.css('top', oldTop);
			tbBox.animate({'top':newTop}, 200, 'swing');
		}
	},

	$ON_SCROLL : function() {
		this.toolbarRepos();
	},

	$ON_LOAD : function() {
		this.toolbarRepos();
	},

	$ON_SHOW_EDITOR : function(name) {
		this.editArea.sortable('disable');
		if(this.cur_focus&&this.cur_focus.length>0)this.cur_focus.blur();

		// 입력 설명 가리기
		this.blankBox.remove();

		// 화살표 추가
		this.writeArea.find('>.wToolbarContainer>div.wToolbar').attr('class', 'wToolbar '+name);
		this.writer=name;
	},

	$ON_HIDE_EDITOR : function() {
		this.editArea.sortable('enable');

		// 입력 설명 보이기
		if (this.editArea.find('>div.eArea').length == 0) {
			this.blankBox.appendTo(this.editArea);
		}

		// 화살표 해제
		this.writeArea.find('>.wToolbarContainer>div.wToolbar').attr('class', 'wToolbar');
		this.writer=null;

	},

	$ON_ADD_CONTENT : function(args) {
		// 입력 설명 가리기
		this.blankBox.remove();
		this.writer = null;
	},

	$ON_DEL_CONTENT : function() {
		// 입력 설명 보이기
		if (this.editArea.find('>div.eArea').length == 0) {
			this.blankBox.appendTo(this.editArea);
		}
	},

	$ON_SORT_RECEIVE : function() {
		// 입력 설명 가리기
		this.blankBox.remove();
	},

	$ON_MOVE_PARAGRAPH : function() {
		this.scrollIntoView(this.cur_focus);
	},

	$ON_SELECT_PARAGRAPH : function(bByKeyAction) {
		if (bByKeyAction) this.scrollIntoView(this.cur_focus);
	},
	$ON_SORT_START : function() {
		this.toolbar.css('display', 'none');
	},
	$ON_SORT_STOP : function() {
		this.toolbar.css('display', '');
	},
	$ON_MORE : function(isExpanded) {
		this.toolbarRepos();
	}
});

var dr = xe.DrEditor;
dr.baseWriter = $.Class({
	name  : 'base',
	obj   : null,
	eArea : null,
	wArea : null,
	editor: null,
	inputs: null,
    fontFamily:  null,
    fontSize:  null,
	$init : function(writeArea, oEditor){
		var self = this;

		this.wArea  = writeArea;
		this.editor = oEditor;

		if (typeof xe.DrEditor.baseWriter.prev == 'undefined') xe.DrEditor.baseWriter.prev = null;
		this.obj = writeArea.find('> div.wArea').filter('.'+this.name);

		// Buttons
		var buttons = this.obj.find('div.buttonArea button');
		buttons.eq(0).click(function(e){ self.save(); });
		buttons.eq(1).click(function(e){ self.cancel(); });

		// Inputs
		this.inputs = this.obj.find('input[type=text],textarea');
		this.inputs
			.focus(function(e){ self.onInputFocus(e,this) })
			.blur(function(e){ self.onInputBlur(e,this) })
			.each(function(){ if($(this).attr('title')) $(this).val($(this).attr('title')) })
			.filter('input').keydown(function(e){ if (e.keyCode == 13) { self.save(e); return false } });
	},
	reset : function(){}, /*abstract*/
	showNext : function(){
		if (xe.DrEditor.baseWriter.prev){
			xe.DrEditor.baseWriter.prev.hide();
		}

		this.obj.addClass('open').addClass('here');
		xe.DrEditor.baseWriter.prev = this;

		this.eArea = null;
		this.editor.cur_focus.after(this.obj);
		// 현재 폼에서 가장 먼저 나오는 텍스트 박스에 포커스를 준다.
		var first = this.obj.find('textarea:first,input[type=text]:first').eq(0);
		if (first.length) {
			if ($.trim(first.val()) == '') first.val(first.attr('title'));
			try { first.select().get(0).focus() } catch(e){};
		}

		this.editor.notify('SHOW_EDITOR', [this.name]);

//		this.editor.cur_focus.after($('<div class="eArea xe_content next xe_dr_'+this.name+'">'+this.getData()+'</div>'));
//		this.show(this.editor.cur_focus.next());
	},
	show : function(eArea) {
		if (xe.DrEditor.baseWriter.prev){
			if(eArea) xe.DrEditor.baseWriter.prev.save();
			else xe.DrEditor.baseWriter.prev.hide();
		}

		this.obj.addClass('open');
		xe.DrEditor.baseWriter.prev = this;

		this.eArea = eArea || null;

		if (eArea) {
			this.editor.dummyArea.append(this.editor.tools);
			this.setData(eArea.hide().before(this.obj));
		} else {
			this.wArea.prepend(this.obj);
		}

		// 현재 폼에서 가장 먼저 나오는 텍스트 박스에 포커스를 준다.
		var first = this.obj.find('textarea:first,input[type=text]:first').eq(0);
		if (first.length) {
			if ($.trim(first.val()) == '') first.val(first.attr('title'));
			try { first.select().get(0).focus() } catch(e){};
		}

		this.editor.notify('SHOW_EDITOR', [this.name]);
	},
	hide : function() {
		this.obj.removeClass('open');
		xe.DrEditor.baseWriter.prev = null;

		if (this.eArea){
			this.eArea.show();
		}

		this.editor.writeArea.prepend(this.obj);
		this.editor.notify('HIDE_EDITOR', [this.name]);
		if(this.editor.cur_focus && this.editor.cur_focus.length) this.editor.cur_focus.click();
		return true;
	},
	save : function(e) {
		var self = this;
		this.inputs.each(function(){ self.onInputSave(e,this); });

		var strData = $.trim(this.getData()), oTmp = null;

		if (strData) {
			oTmp    = $(strData);

			if (oTmp.find('img').length || oTmp.text() || oTmp.is('hr,ol,object,embed')) {
				var newElem = $('<div class="here eArea xe_content xe_dr_'+this.name+'">'+strData+'</div>');

				if (this.eArea) {
					var idx = this.eArea.prevAll('div.eArea').length;
					this.editor.dummyArea.append(this.editor.tools);
					this.eArea.before(newElem);
					this.eArea.remove();
					this.editor.cur_focus = this.editor.editArea.find('>div.eArea.here').removeClass('here');
				} else {
					if(this.obj.is('.here')){
						this.obj.after(newElem);
						this.editor.cur_focus = this.obj.removeClass('here').next();
					}else{
						this.editor.editArea.append(newElem);
						this.editor.cur_focus = this.editor.editArea.find('>div.eArea:last').eq(0);
					}
				}
				this.editor.notify('ADD_CONTENT', [this.name]);
			}
		}

		this.hide();

		return false;
	},
	cancel  : function(e){
		this.hide();
	},
	getData : function(){ return '' }, /*abstract*/
	setData : function(eArea){}, /*abstract*/
	onInputFocus : function(e,input) {
		if ((input=$(input)).val() == input.attr('title') && input.attr('title')!='http://') input.val('');
	},
	onInputSave : function(e,input) {
		if ((input=$(input)).val() == input.attr('title')) input.val('');
	},
    setFont : function(fontFamily, fontSize) {
        this.fontFamily = fontFamily;
        this.fontSize = fontSize;
    },
    getFontFamily : function() {
        return this.fontFamily;
    },
    getFontSize : function() {
        return this.fontSize;
    },
	onInputBlur : function(e,input) {
		if ($.trim((input=$(input)).val()) == '') input.val(input.attr('title'));
	},
	toObject : function() {
		return this.obj;
	}
});


// 제목 단락
dr.hxWriter = $.Class({
	name   : 'hx',
	oHead  : null,
	oLevel : null,
	sId : '',
	$init : function() {
		var self = this;
		this.oHead  = this.obj.find('input[type=text]:first');
		this.oLevel = this.obj.find(':radio').click( function(){self.oHead.attr('class', 'inputTitle '+this.value)} );
	},
	reset : function() {
		this.oHead.val(this.oHead.attr('title'));
		this.oLevel.get(0).checked = true;
	},
	getData : function() {
		var tag = this.oLevel.filter(':checked').val();
		var sid  = this.sId || 'h'+(new Date).getTime();

		this.sId = '';

		return '<'+tag+' id="'+sid+'">'+translate(this.oHead.val())+'</'+tag+'>';
	},
	setData : function(eArea) {
		var header = eArea.find('h3,h4,h5').eq(0);
		this.oHead.val(header.text());
		this.sId = header.attr('id') || '';

		this.oLevel.filter('#'+header.get(0).tagName.toLowerCase()).get(0).checked = true;
	}
}).extend(dr.baseWriter);




dr.txtWriter = $.Class({
	name   : 'txt',
	oTitle : null,
	oId    : null,
	oEdit  : null,
	oFrame : null,
	oText  : null,
	newArea: null,
	lastSaved : -1,
	$init  : function() {
		this.oTitle = this.obj.find('input[type=text]:first');
		this.oId    = this.obj.find('input[type=hidden]:first');
		this.oText  = $('<textarea style="display:none">');
		this.oFrame = this.obj.find('iframe').css('height','100%').after(this.oText);
	},
	reset  : function() {
		this.oId.val((new Date()).getTime());
		this.oTitle.val(this.oTitle.attr('title'));
		this.oText.val('');
	},
	show   : function(eArea) {
		var self = this;
		var tx   = this.obj.find('div.txEditor');
		// 이미 할당된 이벤트를 제거하기 위해 에디터를 DOM에서 제거한 후 추가한다.
		tx.prev().after(tx.remove());

		if(this.oEdit) this.oEdit.exec('MSG_APP_DESTORY');

		this.$super.show(eArea);
		this.oEdit = null;

		this.oTitle.blur();
		(function(){
			var fr = self.oFrame.get(0);
			try {
				var s = fr.contentWindow.document.body.innerHTML; // body의 속성에 접근이 가능한지 살펴보기 위한 의미없는 코드
				self.oEdit = self.createWYSIWYGEditor();
			}catch(e){
				setTimeout(arguments.callee, 10);
			}
		})();
	},
	showNext   : function() {
		var self = this;
		var tx   = this.obj.find('div.txEditor');
		// 이미 할당된 이벤트를 제거하기 위해 에디터를 DOM에서 제거한 후 추가한다.
		tx.prev().after(tx.remove());

		this.$super.showNext();
		this.oEdit = null;

		(function(){
			var fr = self.oFrame.get(0);
			try {
				var s = fr.contentWindow.document.body.innerHTML; // body의 속성에 접근이 가능한지 살펴보기 위한 의미없는 코드
				self.oEdit = self.createWYSIWYGEditor();
			}catch(e){
				setTimeout(arguments.callee, 10);
			}
		})();
	},

	getData : function() {
		if(this.oEdit){
			var div   = $('<div>');
			var id    = $.trim(this.oId.val());
			var text  = $.trim(this.oEdit.getIR()).replace(/<p><br ?\/?><\/p>$/i,''); // 줄 끝의 공백은 제거

			html = $.trim(div.append(text).html());
			div.empty();

		}else{
			html ='';
		}

		// 제일 처음 노드가 <p>가 아니면 <p>로 wrap
		if (!/<p[> ]/i.test(html)) html = '<p>'+html+'</p>';

		return html;
	},
	setData : function(eArea) {
		var self = this, html = '';
		var div  = eArea.clone();
		var id   = (new Date).getTime();

		this.oId.val(id);

		this.oTitle.val(this.oTitle.attr('title'));
		div.find('ul.eTool').nextAll().andSelf().remove();

		html = div.html();
		this.oText.val(html);
	},
	save : function(e,appendNew) {
		var eArea = this.eArea, newArea = null;
		var now = (new Date()).getTime();
		//if(jQuery.browser.msie) appendNew = false;

		if (appendNew) {
			newArea = $('<div class="eArea xe_content xe_dr_txt">');
			if (eArea) this.eArea.before(newArea);
			else this.editor.editArea.append(newArea);
		}

		this.$super.save(e);

		if (eArea && $.trim(eArea.html()) == '') eArea.remove();

		if (appendNew) {
			newArea.next().after(newArea);
			this.show(newArea);
		}
	},
	cancel : function(e) {
		this.$super.cancel(e);

		var eArea = this.eArea;
		if (eArea && $.trim(eArea.html()) == '') eArea.remove();
	},
	createWYSIWYGEditor : function() {
		var self = this;
		var ed   = new xe.XpressCore();
		var elAppContainer = this.obj.get(0);
		var oWYSIWYGIFrame = this.oFrame.get(0);
		var oIRTextarea	= this.oText.get(0);
		var pHotkey;

		ed.registerPlugin(new xe.CorePlugin(function(){ this.oApp.exec('FOCUS',[]) }));
		ed.registerPlugin(new xe.StringConverterManager());
		ed.registerPlugin(new xe.XE_EditingAreaVerticalResizer(elAppContainer));
		ed.registerPlugin(new xe.ActiveLayerManager());
		ed.registerPlugin(pHotkey=new xe.Hotkey());
		ed.registerPlugin(new xe.XE_WYSIWYGStyler());
		ed.registerPlugin(new xe.XE_WYSIWYGStyleGetter());
		ed.registerPlugin(new xe.MessageManager(oMessageMap));
		ed.registerPlugin(new xe.XE_Toolbar(elAppContainer));
		ed.registerPlugin(new xe.XE_UndoRedo());
		ed.registerPlugin(new xe.XE_Hyperlink(elAppContainer));
		ed.registerPlugin(new xe.XE_EditingAreaManager("WYSIWYG", oIRTextarea, {nHeight:200, nMinHeight:100}, null, elAppContainer));
		ed.registerPlugin(new xe.XE_EditingArea_HTMLSrc(oIRTextarea));
		ed.registerPlugin(new xe.XE_EditingArea_WYSIWYG(oWYSIWYGIFrame));
		ed.registerPlugin(new xe.XpressRangeManager(oWYSIWYGIFrame));
		ed.registerPlugin(new xe.XE_ExecCommand(oWYSIWYGIFrame));
		ed.registerPlugin(new xe.XE_FontSizeWithSelectUI(elAppContainer));
		ed.registerPlugin(new xe.XE_ColorPalette(elAppContainer));
		ed.registerPlugin(new xe.XE_FontColor(elAppContainer));
		ed.registerPlugin(new xe.XE_BGColor(elAppContainer));
		ed.registerPlugin(new xe.XE_FontSetter(this.getFontFamily(), this.getFontSize()));

		if (!$.browser.msie && !$.browser.opera) {
			ed.registerPlugin(new xe.XE_WYSIWYGEnterKey(oWYSIWYGIFrame));
		}

		// Ctrl+Enter를 입력하면 현재 문단 저장 후 새 텍스트 문단을 보여준다.
        pHotkey.add(pHotkey.normalize('ctrl+enter'), function(){ 
			setTimeout(function() { self.save(null,true) }, 1);
		});

		// 폰트 적용 
		var doc = oWYSIWYGIFrame.contentWindow.document;

		// 에디터 시작
		ed.run();

		return ed;
	}
}).extend(dr.baseWriter);



dr.linkWriter = $.Class({
	name  : 'link',
	oTxt  : null,
	oUrl  : null,
	oDesc : null,
	$init : function(writeArea, oEditor) {
		var inputs = this.obj.find('input[type=text]');
		this.oTxt  = inputs.eq(0);
		this.oUrl  = inputs.eq(1);
		this.oDesc = inputs.eq(2);
	},
	setData : function(eArea) {
		this.oTxt.val(eArea.find('p > strong').text());
		this.oUrl.val(eArea.find('p > a').attr('href'));
		this.oDesc.val(eArea.find('p').eq(1).text()).blur();
	},
	getData : function() {
		var div  = $('<div>');
		var txt  = $.trim(this.oTxt.val());
		var url  = $.trim(this.oUrl.val());
		var desc = $.trim(this.oDesc.val());
		var html = '<p>';

		if(!url) return;

		if(txt) html += '<strong>'+div.text(txt).html()+'</strong>';
		html += '<a href="'+url+'">'+url+'</a>';
		html += '</p>';

		if(desc) html += '<p>'+desc+'</p>';

		return html;
	},
	reset : function() {
		this.oTxt.val(this.oTxt.attr('title'));
		this.oUrl.val(this.oUrl.attr('title'));
		this.oDesc.val(this.oDesc.attr('title'));
	}
}).extend(dr.baseWriter);

dr.listWriter = $.Class({
	name   : 'list',
	oList  : null,
	focusedObj :  null,
	$init  : function() {
		this.oList  = this.obj.find('div.listArea');

		// event binding
		this.$onkeydown  = $.fnBind(this.onkeydown, this);
		this.$onfocus    = $.fnBind(this.onfocus, this);
		this.$onblur     = $.fnBind(this.onblur, this);
		this.$onbtnclick = $.fnBind(this.onbtnclick, this);

		// toolbar
		this.obj.find('ul.toolbar button').click(this.$onbtnclick);
	},
	show   : function(eArea) {
		this.$super.show(eArea);
	},
	reset : function() {
		this.oList.empty().append('<ul>'+this.newItem()+'</ul>');
		this.setEvent();
	},
	getData : function() {
		var t = this.oList.clone();
		var s = '';

		t.find('input[type=text]').each(function(){
			var o = $(this), par = o.parent('li');
			
			if ($.trim(o.val()) == '') {
				if (par.parent('ul,ol').children('li').length == 1) {
					if (par.find('ul,ol').length) {
						o.replaceWith($('<span>&nbsp;</span>'));
					} else {
						par.parent().remove();
					}
				} else {
					par.remove();
				}
			} else {
				var t =$('<span>').text(o.val());
				o.replaceWith(t);
			}
		});

		s = t.html();
		if (!s) return '';

		return s;
	},
	setData : function(eArea) {
		this.oList.html(eArea.html()).find('span').each(function(){
			var o = $(this), ip = $('<input type="text">').val(o.text()), a = o.find('>a');
			o.replaceWith(ip);
		});

		this.setEvent();
	},
	setEvent : function() {
		this.oList.find('input[type=text]:not(.hasHandler)').addClass('hasHandler').addClass('xe_content').keydown(this.$onkeydown).focus(this.$onfocus).blur(this.$onblur);
	},
	newItem : function(returnObject) {
		var html = '<li><input type="name" /></li>';

		return returnObject?$(html):html;
	},
	moveUp : function(obj, li) {
		if (li.prev('li').length) return li.prev('li').before(li);

		var lev = this.getLevel(li);
		if (lev == 1) return;

		var par = li.parent().parent('li');
		var prv = par.prev('li');
		if (prv.length) {
			var oul = prv.children('ul,ol');
			if (!oul.length) oul = $('<ul>').appendTo(prv);
			oul.append(li);
		} else if (li.is(':first') && par.is(':first')) {
			par = par.parents('li');
			par.eq(par.length-1).before(li);
		} else {
			par.parent('ol,ul').prepend(li);
		}
	},
	moveDown : function(obj, li) {
		if (li.next('li').length) return li.next('li').after(li);

		var lev = this.getLevel(li);
		if (lev == 1) return;

		var par = li.parent().parent('li');
		var nxt = par.next('li');

		if (nxt.length) {
			var oul = nxt.children('ul,ol');
			if (!oul.length) oul = $('<ul>').appendTo(nxt);
			oul.prepend(li);
		} else if (li.is(':last') && par.is(':last')) {
			par = par.parents('li');
			par.eq(par.length-1).after(li);
		} else {
			par.parent('ol,ul').append(li);
		}
	},
	moveLeft : function(obj, li) {
		if (this.getLevel(li) == 1) return;

		var next = li.nextAll('li');
		var list = li.children('ul,ol');

		if (next.length) {
			if (!list.length) li.append(list = $('<ul>'));
			list.append(next);
		}

		li.parent().parent('li').after(li);
	},
	moveRight : function(obj, li) {
		var prev = li.prev('li');
		var list = prev.children('ul,ol');

		if (list.length) {
			list.append(li);
		} else if (prev.length) {
			$('<ul>').append(li).appendTo(prev);
		}
	},
	getLevel : function(elem) {
		var el  = $(elem).get(0);
		var lev = 0;
		var tag = '';
		
		while(el) {
			tag = el.tagName.toLowerCase();
			if (tag == 'div' && el.className == 'listArea') break;
			if (tag == 'ul' || tag == 'ol') lev++;
			el = el.parentNode;
		}

		return lev;
	},
	onbtnclick : function(e) {
		var btn = $(e.target);
		var typ = btn.attr('class').match(/type_([a-z-]+)/i);

		typ = typ?typ[1]:'';

		if (!this.focusedObj) return alert(no_selected_object_msg);

		var par = this.focusedObj.parent('li').parent('ul,ol');
		if (par.length && typ) par.eq(0).css('list-style-type', typ);

		this.focusedObj.focus();
	},
	onkeydown : function(e) {
		var meta = ((navigator.platform||'').indexOf('Mac')<0)?true:e.metaKey;
		var ctrl = e.ctrlKey && meta;
		var obj  = $(e.target);
		var li   = obj.parent('li');
		var item, ul, stop = false;

		switch(e.keyCode) {
			case 13: // enter
				stop = true;
				if (!$.trim(obj.val())) {
					alert('값을 입력해주세요.');
					return obj.focus() && false;
				}

				li.after(item = this.newItem(true));
				this.setEvent();
				item.find('>input').focus();
				break;
			case 37: // left
				if (!ctrl) break;
				stop = true;
				this.moveLeft(obj, li);
				setTimeout(function(){obj.focus();},0.1);
				break;
			case 39: // right
				if (!ctrl) break;
				stop = true;
				this.moveRight(obj, li);
				setTimeout(function(){obj.focus();},0.1);
				break;
			case 38: // up
				if (!ctrl) {
					if (!e.altKey && !e.shiftKey) {
						var objs = this.obj.find('input[type=text]');
						var idx  = objs.index(obj);
						if (idx > 0) objs.eq(idx-1).focus();
					}
					break;
				}
				stop = true;
				this.moveUp(obj, li);
				setTimeout(function(){obj.focus();},0.1);
				break;
			case 40: // down
				if (!ctrl) {
					if (!e.altKey && !e.shiftKey) {
						var objs = this.obj.find('input[type=text]');
						var idx  = objs.index(obj);
						if (idx < objs.length-1) objs.eq(idx+1).focus();
					}
					break;
				}
				stop = true;
				this.moveDown(obj, li);
				setTimeout(function(){obj.focus();},0.1);
				break;
		}

		return !stop;
	},
	onfocus : function(e) {
		this.focusedObj = $(e.target).addClass('hasFocus');
	},
	onblur : function(e) {
/*
		var old  = e.target;
		var self = this;

		setTimeout(function(){
			if (self.focusedObj && self.focusedObj.get(0) == old) self.focusedObj = null;
		}, 100);
*/
	}
}).extend(dr.baseWriter);

dr.blockquoteWriter = $.Class({
	name : 'blockquote',
	oTxt  : null,
	oSrc  : null,
	$init : function(writeArea, oEditor) {
		this.oTxt = this.obj.find('textarea:first');
		this.oSrc = this.obj.find('input[type=text]:first');
	},
	getData : function() {
		var str = this.oTxt.val();
		var src = this.oSrc.val();
		if(!str) return;

		var r ='<blockquote><p>'+translate(str)+'</p>';
		if(src) r+='<cite>'+translateCite(src)+'</cite>';
		r +='</blockquote>';
		return r;
	},
	setData : function(eArea) {
		var div = $('<div>').append(eArea.find('blockquote').clone());

		div.find('cite').remove();

		this.oTxt.val(div.text());
		this.oSrc.val(eArea.find('cite').html());
	},
	reset : function() {
		this.oTxt.val('').blur();
		this.oSrc.val('').blur();
	}
}).extend(dr.baseWriter);


dr.imgWriter = $.Class({
	name    : 'img',
	oForm   : null,
	oFrame  : null,
	oFile   : null,
	oDesc   : null,
	oImg    : null,
	oMsg    : null,
	oCancel : null,
	timer   : null,
	cbID    : '',
	srl	: '',

	$init : function() {
		var self = this;

		this.oFile = this.obj.find('input[type=file]');
		this.oDesc = this.obj.find('input[type=text].desc');
		this.oCite = this.obj.find('input[type=text].cite');
		this.oImg  = this.obj.find('div.image > img').eq(0);
		this.oResize  = this.obj.find('div.resize');
		this.oResizeError  = this.obj.find('div.resize .resizeError');
		this.oMsg    = this.obj.find('p.uploading');
		this.oCancel = this.oMsg.find('>button').click(function(){ self.reset(); });
		this.src = null;
		this.resized = false;
		this.oResize.find('button.btn_resize').click(function(e){
			var w = self.oResize.find('input.width.copy').val();	
			if(!self.src) self.src = self.oImg.attr('src');

			if(parseInt(w) > parseInt(self.oResize.find('dd>em').html())){
				self.oResizeError.addClass('open');
				return false;
			}else{
				self.oResizeError.removeClass('open');
				$.exec_json('file.procFileImageResize',{width:w, source_src:self.src},function(data){
					if(data.error==0){
						self.resized =true;
						self.oImg.attr({
							src:data.resized_info.src,
							width:data.resized_info.info[0],
							height:data.resized_info.info[1]
							});
					}
				});
			}		
		});
		this.oFrame = $('<iframe name="xe_dr_imgframe_'+(new Date).getTime()+'" style="position:absolute;width:1px;height:1px">').css('opacity',0).appendTo(this.obj);

		var strForm = '<form action="" target="'+this.oFrame.attr('name')+'" method="POST" enctype="multipart/form-data"><input type="hidden" name="editor_sequence" value="'+this.editor.seq+'" /><input type="hidden" name="callback" /><input type="hidden" name="file_srl" /><input type="hidden" name="mid" value="'+current_mid+'" /><input type="hidden" name="module" value="file" /><input type="hidden" name="act" value="procFileIframeUpload" /><input type="hidden" name="uploadTargetSrl" value="" />';

		if(typeof(xeVid)=='undefined') {
			this.oForm = $(strForm+'</form>');
		} else {
			this.oForm  = $(strForm+'<input type="hidden" name="vid" value="'+xeVid+'" /></form>');
		}
		this.oForm.prependTo(document.body);
		this.oFile.change($.fnBind(this.onFileChange, this));
		this.oImg.parent().hide();
	},
	getData : function() {
		var desc = this.oDesc.val();
		var cite = this.oCite.val();

		if(desc == this.oDesc.attr('title')) desc = '';
		if(!this.oImg.attr('src'))return;

		var r ='<p>'+this.oImg.parent().html()+'</p>';
		if(desc) r+='<p class="desc">'+translate(desc)+'</p>';
		if(cite) r+='<p class="cite">'+translateCite(cite)+'</p>';
		return r;
	},
	setData : function(eArea) {
		var img = eArea.find('img');
		var srl = img.attr('class').match(/xe_file_srl_(\d+)/);
		// 폼 리셋
		this.reset();

		// 시리얼 찾고
		this.srl = srl?srl[1]:'';

		// 사진 보여주기
		this.showResize('', img.attr('src'));

		// 사진 설명
		this.oDesc.val(eArea.find('p.desc').html()).blur();
		this.oCite.val(eArea.find('p.cite').html()).blur();
	},

	reset : function() {
		var prev = this.oFile.prev();
		this.resized = false;
		this.oForm.append(this.oFile).get(0).reset();
		prev.after(this.oFile);

		this.src=null;
		this.srl=null;
		this.oImg.attr('src','');
		this.oImg.attr('class','');
		this.oDesc.val('').blur();
		this.oCite.val('').blur();
		this.oResize.removeClass('open');
		this.oResizeError.removeClass('open');
		this.oImg.parent().hide();
		this.oMsg.hide();

		this.oFrame.attr('src', 'about:blank');
	},
	/**
	 * @brief 파일을 선택한 직후
	 **/
	onFileChange : function(e) {
		var self = this, prev = this.oFile.prev();
		
		if(!/\.(gif|jpg|png|jpeg)$/i.test(this.oFile.val())){
			this.oFile.val('');
			return;
		}

		// 콜백
		if (this.cbID) window[this.cbID] = function(){};
		this.cbID = ''+(new Date).getTime()+Math.ceil(Math.random()*1000);
		window[this.cbID] = $.fnBind(this.onFileUploaded, this);

		// 파일을 바로 업로드 한다.
		this.oForm.find('input[name=callback]').val(this.cbID);
		this.oForm.find('input[name=file_srl]').val(this.srl);
		this.oForm.find('input[name=uploadTargetSrl]').val(editorRelKeys[this.editor.seq]["primary"].value);
		this.oForm.append(this.oFile);
		this.oForm.submit();
		setTimeout(function(){ prev.after(self.oFile) }, 0);

		// 이미지를 숨기고 업로드 중이라는 메시지를 보여준다.
		this.oImg.parent().hide();
		this.oMsg.show();
	},
	/**
	 * @brief 파일 업로드가 완료되었을 때
	 **/
	onFileUploaded : function(fileObj) {
		if(fileObj.error==-1){
			alert(fileObj.message);
			return;
		}
		var self = this;

		this.srl = fileObj.file_srl;
		this.oImg.removeAttr('src').removeAttr('width').removeAttr('height');

        if(fileObj.upload_target_srl && fileObj.upload_target_srl != 0) {
            editorRelKeys[this.editor.seq]["primary"].value = fileObj.upload_target_srl;
        }

		this.showResize('xe_file_srl_'+fileObj.file_srl,fileObj.uploaded_filename);
		this.oMsg.hide();

		// 이미지 파일도 서버측에서는 파일로 카운트 되므로,
		// reloadFileList를 호출해서 orderedFiles와 uploadedFiles 배열을 갱신해주도록 한다.
		// 관련 이슈 : http://textyle.xpressengine.net/18256095
		var settings = {
			fileListAreaID : '',
			editorSequence : this.editor.seq,
			uploadTargetSrl : ''
		};
		reloadCallback[this.editor.seq] = function(){};
		reloadFileList(settings);
	},

	showResize : function(css,src){
		var self = this;

		this.oImg.removeAttr('src').removeAttr('width').removeAttr('height');
		if(css) this.oImg.addClass(css);
		this.oImg.attr({'src' : src	,'alt':''}).load(function(e){
			var w = this.width, h=this.height,t=$(this);
			if(w>600 && !self.resized){
				self.oResize.addClass('open');
				self.oResize.find('dd>em').html(w);
				self.oResize.find('dd>input').val(600);
			}
		}).parent().show();
	}
}).extend(dr.baseWriter);


dr.movWriter = $.Class({
	name  : 'mov',
	oCode : null,
	oDesc : null,
	$init : function(writeArea, oEditor) {
		var textarea = this.obj.find('textarea');
		this.oCode = textarea.eq(0);
		this.oDesc = textarea.eq(1);
		this.oCite = this.obj.find('input[type=text]').eq(0);
	},
	getData : function() {
		var code = this.oCode.val();
		var desc = this.oDesc.val();
		var cite = this.oCite.val();

		if(!code) return;
		if(desc) code += '<p class="desc">'+translate(desc)+'</p>';
		if(cite) code += '<p class="cite">'+translateCite(cite)+'</p>';
		return code;
	},
	setData : function(eArea) {
		var code = $('<div>').append(eArea.find('object,embed').eq(0)).html();
		this.oCode.val(code || this.oCode.attr('title'));
		this.oDesc.val(eArea.find('p.desc').text()).blur();
		this.oCite.val(eArea.find('p.cite').html()).blur();
	},
	reset : function() {
		this.oCode.val('').blur();
		this.oDesc.val('').blur();
		this.oCite.val('').blur();
	}
}).extend(dr.baseWriter);



dr.fileWriter = $.Class({
	name  : 'file',
	init  : false,
	oTpl  : null,
	oDesc : null,
	rxSrl : /filesrl_([0-9-]+)/,
	$init : function(writeArea, oEditor) {
		this.oTpl  = this.obj.find('dl>dd:first').remove();
		this.oDesc = this.obj.find('input[type=text]').eq(0);
		this.oCite = this.obj.find('input[type=text]').eq(1);
	},
	show  : function(eArea) {
		var self = this;
		this.$super.show(eArea);
		if (!this.init) {
			reloadCallback[this.editor.seq] = $.fnBind(this.onReloadFileList, this);

			uploaderSettings['editorSequence'] = this.editor.seq;
			uploaderSettings['upload_start_handler'] = $.fnBind(this.onUploadStart, this);
			uploaderSettings['upload_success_handler'] = function(file,serverData){self.onUploadSuccess(file,serverData,this)};
			editorUploadInit(uploaderSettings);

			this.init = true;
		}
	},
	getData : function() {
		var self = this;
		var d = this.oDesc.val();
		var c = this.oCite.val();
		var dl = '<dl class="attachedFile"><dt>첨부파일</dt>';
		if (d == this.oDesc.attr('title')) d = '';
		else d = '<p class="desc">'+translate(d)+'</p>';
		if (c == this.oCite.attr('title')) c = '';
		else c = '<p class="cite">'+translateCite(c)+'</p>';

		if(this.obj.find('dl > dd').size()==0) return;

		this.obj.find('dl > dd').each(function(){
			var dd  = $(this);
			var srl = dd.attr('class').match(self.rxSrl);

			if (!srl) return;
			if ((srl = parseInt(srl[1])) < 0) return;

			var fileObj = uploadedFiles[srl];
			dl += '<dd class="filesrl_'+srl+'"><a href="'+ request_uri + fileObj.download_url+'">'+fileObj.source_filename+'</a> '+fileObj.disp_file_size+'</dd>';
		});

		dl += '</dl>';

		return dl+d+c;
	},
	setData : function(eArea) {
		var self = this;

		this.totalFileCount = 0;
		this.totalFileSize = 0;

		// 요약 정보 보이기
		this.obj.find('p.summary').next('div.hr').andSelf().show();

		// 파일 설명
		this.oDesc.val(eArea.find('p.desc').text()).blur();
		this.oCite.val(eArea.find('p.cite').text()).blur();

		// 파일정보 가져와서 세팅
		this.obj.find('dl').empty();
		eArea.find('dl.attachedFile > dd').each(function(){
			var dd  = $(this);
			var tpl = self.oTpl.clone().show();
			var srl = dd.attr('class').match(self.rxSrl);

			if (!srl || srl.length < 2) return;
			srl = parseInt(srl[1]);

			self.totalFileCount++;
			self.totalFileSize += parseInt(uploadedFiles[srl].file_size)||0;

			tpl.addClass('filesrl_'+srl);
			tpl.find('>strong').text(dd.find('>a').text());
			tpl.find('>em').text(dd.find('>span').text());

			self.obj.find('dl').append(tpl);
		});

		// 종합 정보
		var summary = this.obj.find('p.summary');
		summary.next('div.hr').andSelf().show();
		summary.find('.filecount').text(this.totalFileCount);
		summary.find('.filesize').text(this.formatSize(this.totalFileSize));
	},
	reset : function() {
		this.totalFileCount = 0;
		this.totalFileSize = 0;

		this.obj.find('dl').empty();
		this.oDesc.val('').blur();
		this.oCite.val('').blur();
		this.obj.find('p.summary').next('div.hr').andSelf().hide();
	},
	formatSize : function(size) {
		size = parseFloat(size);
		if (isNaN(size)) return 'NaN';

		var units = ['B','KB','MB','GB','TB'];
		var i = 0;

		while((i < units.length-1) && size > 1024) {
			size /= 1024;
			i++;
		}

		size = (size+'').replace(/(\.\d{2})\d+$/, '$1') + ' ' + units[i];

		return size;
	},
	onUploadStart : function() {
		this.queueIndex = 0;
		return true;
	},
	onUploadSuccess : function(file, serverData, obj) {
		this.onFileUploaded(file);
		if (obj.getStats().files_queued > 0) obj.startUpload();
	},
	onFileUploaded : function(fileObj) {
		var self = this;
		var tpl  = this.oTpl.clone().show();

		tpl.find('>strong').text(fileObj.name);
		tpl.find('>em').text(this.formatSize(fileObj.size));
		tpl.addClass('filesrl_-'+(orderedFiles.length+this.queueIndex));
		tpl.find('button.buttonDelete').click(function(){
			var btn = $(this);
			var srl = btn.parent().attr('class').match(self.rxSrl);

			if (!srl) return;
			if ((srl = parseInt(srl[1])) < 0) return;

			// TODO : 파일을 서버에서 제거 후 onFileDelete 실행

			self.onFileDelete(btn);
		}).hide();

		this.obj.find('dl').append(tpl);

		this.queueIndex++;

		// 요약 정보
		this.totalFileCount++;
		this.totalFileSize += fileObj.size;

		var summary = this.obj.find('p.summary');
		summary.next('div.hr').andSelf().show();
		summary.find('.filecount').text(this.totalFileCount);
		summary.find('.filesize').text(this.formatSize(this.totalFileSize));
	},
	onFileDelete : function(obj) {
		var summary = this.obj.find('p.summary');

		obj.parent().remove();

		if (this.obj.find('dl > dd').length == 0) {
			summary.next('div.hr').andSelf().hide();
		}
	},
	onReloadFileList : function(upload_target_srl) {
		var self = this;
        if(upload_target_srl && upload_target_srl != 0) {
            editorRelKeys[this.editor.seq]["primary"].value = upload_target_srl;
        }

		this.obj.find('dl > dd').each(function(){
			var dd  = $(this);
			var srl = dd.attr('class').match(self.rxSrl);
			var cls;

			if (!srl) return;
			cls = srl[0];
			srl = parseInt(srl[1]);

			if (srl <= 0) {
				var fileObj = orderedFiles[Math.abs(srl)];

				if (!fileObj) return;

				// 기존 파일 시퀀스를 지우고 새 시퀀스 추가
				dd.removeClass(cls).addClass('filesrl_'+fileObj.file_srl);

				// 삭제버튼 보여주기
				dd.find('button.buttonDelete').show();
			}
		});
	}
}).extend(dr.baseWriter);

dr.hrWriter = $.Class({
	name : 'hr',
	oRadio : null,
	$init : function(writeArea, oEditor) {
		this.oRadio = this.obj.find('input[type=radio]');
		this.oMore  = this.obj.find('input[type=text]:first');
		this.oLess  = this.obj.find('input[type=text]:last');
	},
	getData : function() {
		var type = this.oRadio.filter('[checked]').val();
		switch (type) {
			case 'hline':
				return '<hr noshade="noshade" />';
			case 'fold_from':
				return '<span class="more">'+this.oMore.val()+'</span><span class="less">'+this.oLess.val()+'</span>';
			case 'fold_to':
				return '<span class="more_end"></span>';
		}

		return '';
	},
	setData : function(eArea) {

	},
	reset : function() {

	}
}).extend(dr.baseWriter);

dr.indexWriter = $.Class({
	name   : 'index',
	$init  : function(writeArea, oEditor) {
	},
	reset : function() {
		this.obj.find('ul').html(this.getIndexHTML());
	},
	getData : function() {
		return '<ul class="toc">'+this.getIndexHTML()+'</ul>';
	},
	setData : function(eArea) {
	},
	getIndexHTML : function() {
		var html = [];
		var rand = (new Date).getTime();
		this.editor.editArea.find('div.xe_dr_hx>h3,div.xe_dr_hx>h4,div.xe_dr_hx>h5').each(function(idx){
			var id = $(this).attr('id') || rand+'-'+idx;
			var hx = $(this).attr('id', id);
			html.push('<li class="toc'+this.nodeName.replace(/[^0-9]/,'')+'"><a href="#'+id+'">'+hx.text()+'</a></li>');
		});

		return html.join('');
	},
	$ON_ADD_CONTENT : function(type) {
		if (type != 'hx') return;
		this.editor.editArea.find('div.xe_dr_index ul.toc').html(this.getIndexHTML());
	},
	$ON_DEL_CONTENT : function(type) {
		if (type != 'hx') return;
		this.editor.editArea.find('div.xe_dr_index ul.toc').html(this.getIndexHTML());
	},
	$ON_SORT_STOP : function(type) {
		this.editor.editArea.find('div.xe_dr_index ul.toc').html(this.getIndexHTML());
	}
}).extend(dr.baseWriter);

// Utility function
var table = {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'};
function translate(str) {
	var s = str.replace(/<|>|&|"/ig, function(m0) {
		if (table[m0]) return table[m0];
	});

	return s;
}
function translateCite(str) {
	var s = str.replace(/<(\/)?([abi]|em|strong|cite)(.*?)>|<|>|&|"/ig, function(m0,m1,m2,m3) {
		m1 = m1 || '';
		m2 = m2.toLowerCase();
		m3 = m3 || '';

		if (table[m0]) return table[m0];
		if (m3 && m3.substr(0,1) != ' ') return '&lt;'+m1+m2+m3+'&gt;';
		if (m2 == 'em' || m2 == 'strong' || m2 == 'a' || m2 =='cite') return '<'+m1+m2+m3+'>';
		if (m2 == 'b') return '<'+m1+'strong>';
		if (m2 == 'i') return '<'+m1+'em>';
	});

	return s;
}

})(jQuery);
