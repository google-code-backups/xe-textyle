jQuery(function($){
	jQuery.fn.imageScroller = function(params){
	 var p = params || {
		obj:"#post",
		auto:true
	 };

	 var _obj = p.obj;
	 var _auto = p.auto;
	 var _itv;
	 var delay = 5000;
	 var _numberimgs = 2;
	 
	 var scrollImg = function() {
		 if(_auto) autoStop();
		 //TODO go with my animate
		 var _next = 0;
		 var _curr = 0;

		 var className = $(_obj).attr('class');
		 _curr = className.replace('post_img','')

		 if(_curr=="") _curr = 0;
		 
		 _next = (parseInt(_curr)+1)%_numberimgs;

		$(_obj).animate({opacity:0.0},500 , function() {
			if(_next==0){
				$(_obj)[0].className = "post_img" ;
			}
			else{
				$(_obj)[0].className = "post_img" + (_next);
			}
		});

		$(_obj).animate({opacity:1.0},500);
	
		if(_auto) autoPlay(delay);
	}

	var autoPlay = function(delay){
		if (!delay) delay = 0;
		_itv = window.setInterval(scrollImg, delay || 5000);
	};

	var autoStop = function(){
		window.clearInterval(_itv);
	};
	
	if(_auto) autoPlay(delay);

	  $('#header').find('.prev').click(function() {
			autoStop();
			var _prev = 0;
			var _curr = 0;

			var className = $(_obj).attr('class');
			_curr = className.replace('post_img','')
			if(_curr=="") _curr = 0;
			
			if(_curr == 0) _prev = _numberimgs-1;
			else _prev = (parseInt(_curr)-1)%_numberimgs;

		   $(_obj).animate({opacity:0.0},500, function() {
				if(_prev==0) $(_obj)[0].className = "post_img" ;
				else $(_obj)[0].className = "post_img" + (_prev);
			});

			$(_obj).animate({opacity:1.0},500);

			if(_auto) autoPlay(delay);
		    return false;
      });

	   $('#header').find('.next').click(function() {
			autoStop();
			var _next = 0;
			var _curr = 0;
			
			var className = $(_obj).attr('class');
			_curr = className.replace('post_img','')
			if(_curr=="") _curr = 0;
			
			_next = (parseInt(_curr)+1)%_numberimgs;

		   $(_obj).animate({opacity:0.0},500, function() {
				if(_next==0)
					$(_obj)[0].className = "post_img" ;
				else
					$(_obj)[0].className = "post_img" + (_next);
			});

			$(_obj).animate({opacity:1.0},500);

			if(_auto) autoPlay(delay);
		    return false;
      });

 }; 
});


jQuery(function($){
	$("#post").imageScroller(); 
});

