import { getRandomInt } from "../_Utils/RandomInt";
import { JuelScrollPane } from "./ScrollPane";

export class ScrollPaneService {
    
    psArray: number[];
    container: HTMLElement;
    children: JQuery<Element>;
	childCount: number;
	randNumbers: number[];

    constructor(private sp: JuelScrollPane) {

    }

    init() {
        this.container = this.sp.shadowRoot.getElementById('container');
        let first = this.container.firstElementChild as HTMLElement;
        //this.sp.style.width = `${$(first).outerWidth()}px`;
		//this.sp.style.height = `${$(first).outerHeight}px`;
		this.container.style.width = first.style.width;
        this.container.style.height = first.style.height;
		this.children = $(this.container.querySelectorAll('.item'));
		
		this.randNumbers = [ this.sp.position ];
		if (this.sp.position > 0) {
			this.scrollTo(this.sp.position);
		}

        if (this.sp.tabs) {
            $(this.sp.tabs).each((index, el) => {
                $(el).on('click', () => this.scrollTo(index));
            })
		}
		
		if (this.sp.next) {
			$(this.sp.next).on('click', () => this.next());
		}
		if (this.sp.previous) {
			$(this.sp.previous).on('click', () => this.previous());
		}

		if (this.sp.random) {
			$(this.sp.random).on('click', () => this.random());
		}

		$(this.sp).children().each((index, el) => {
			if (el.hasAttribute('data-toggle')) {
				let sel = el.dataset['toggle'];
				console.log("Here " + sel)
				$(sel).on('click', () => {
					if (this.sp.position != index) {
						this.scrollTo(index);
					} else {
						this.scrollTo(this.sp.master);
					}
				})
			}
		})
    }

    scrollTo(index: number) {
        let el = $(this.children[index]);
        let margin: number = 0;
        let prev = el.prevAll();
        if (prev.length > 0) {
			prev.each((i, sib) => {
				margin+=$(sib).outerWidth();
				console.log(`+ ${$(sib).outerWidth()} = ${margin}`)
			});
		}
	this.sp.style.width = `${el.outerWidth()}px`;
      //  this.sp.style.height = `${el.outerHeight()}px`;
		this.container.style.marginLeft = `-${margin}px`;
		this.sp.position = index;
	}

	next() {
		this.sp.position ++;
		if (this.sp.position >= this.children.length) {
			this.sp.position = 0;
		}
		this.scrollTo(this.sp.position);
	}

	previous() {
		this.sp.position --;
		if (this.sp.position < 0) {
			this.sp.position = this.children.length - 1;
		}
		this.scrollTo(this.sp.position);
	}
	
	random() {
		let index = getRandomInt(this.children.length);
		while (this.randNumbers.some(n => n == index)) {
			index = getRandomInt(this.children.length);
		}
		this.scrollTo(index);
		this.sp.position = index;
		this.randNumbers.push(index);
		if (this.randNumbers.length == this.children.length) {
			this.randNumbers = [ index ];
		}
	}
}
		/*
		if (settings.Orientation == "horizontal")
		{
			children.each(function(i) {
				width += $(this).outerWidth();
					
				if ($(this).outerHeight() > height)
					height = $(this).outerHeight()
			});
			wrapper.css({'width' : width, 'height' : height});
		}
		wrapper.append(children);
		var upperLimit = 0, lowerLimit = 0;
		var psArray = [];
		
		
		this.append(wrapper); width = wrapper.width(), height = wrapper.height();
		var min = 0, max = 0;
		if (settings.Orientation == "vertical")
		{

			max = -(wrapper.outerHeight() - this.outerHeight());
		}
		else if (settings.Orientation == "horizontal")
		{
			max = -(wrapper.outerWidth() - this.outerWidth());
		}

		//children.css({display : 'inline'});

		children.each(function() {
			DisableDragging($(this));
			addPosition($(this));
		});
		if(settings.Tabs) {
			settings.Tabs.each(function(index, e) {
				//alert(this.toSource());
				$(this).bind('click', function() {
					selectTab($(this));
					ele.ScrollToIndex(index);
				});
			});
        }
    }

	selectTab(tab) {
			tab.addClass("lui-scrollpane-tab-selected");
					tab.siblings().not("lui-scrollpane-exclude").each(function() {
						if (tab.hasClass("lui-scrollpane-tab-selected")) {
							tab.removeClass("lui-scrollpane-tab-selected");
						}
					});
		}

		var ele = this;
		
		if(settings.Auto) {
			var timer = setInterval(Tick, settings.Interval);
		}
		this.bind('mouseenter', function() {
			if(timer)
				clearInterval(timer);
		}).bind('mouseleave', function() {
			if(settings.Auto)
				timer = setInterval(Tick, settings.Interval);
		});
		function Tick() {
			ele.NextSlide();
		}
		
		if(settings.ControledBy == 'flick') {
			this.MouseGestures('Flick');
			//LayoutChildren(ele);
			this.bind('flick', function(event, sample) {
				//alert('flick');
				var rightOrDown;
				if((settings.Orientation === "horizontal" && sample.MouseDifference.X < 0) || (settings.Orientation === "vertical" && sample.MouseDifference.Y < 0)) {
					currentPos++;
					if(currentPos >= childCount)
						currentPos = 0;

					ScrollBy(sample.MouseDifference.Y * 2);
				}// If greater than 0, go left or up
				else if((settings.Orientation === "horizontal" && sample.MouseDifference.X > 0) || (settings.Orientation === "vertical" && sample.MouseDifference.Y > 0)) {
					currentPos--;
					if(currentPos < 0)
						currentPos = childCount - 1;

					ScrollBy(sample.MouseDifference.Y * 20);
				}

			});
		}
		else if (settings.ControledBy == 'move')
		{
			this.bind('mousemove', function(event) {
				var x = event.pageX - ele.position().left;
				var y = event.pageY - ele.position().top;
				
				var xp = x / ele.outerWidth();
				var yp = y / ele.outerHeight();

							if(settings.Orientation == "horizontal") {
				wrapper.stop(true).css({
					'marginLeft' : -(xp * width)});
			} else if(settings.Orientation == "vertical") {
				wrapper.stop(true).css({
					'marginTop' : -(yp * height)});
			}
			});
		}

		function addPosition(ele) {
			if(settings.Orientation == 'horizontal') {
				psArray.push(-parseInt(ele.position().left - topLeft.left));
			} else if(settings.Orientation == 'vertical') {
				psArray.push(-parseInt(ele.position().top - topLeft.top));
			}
		}

		function DisableDragging(ele) {
			ele.bind('mousedown', function(event) {
				event.preventDefault();
			})
			ele.children().each(function() {
				DisableDragging($(this));
			})
		}

		function ScrollBy(amount) {
			//alert("previous")
			if(settings.Orientation == "horizontal") {
				wrapper.stop().animate({
					'marginLeft' : '+=' + amount
				}, 'slow', PositionChanged);
			} else if(settings.Orientation == "vertical") {
				wrapper.stop().animate({
					'marginTop' : '+=' + amount
				}, 'slow', PositionChanged);
			}
			
		}

		function PositionChanged() {
			var margin = parseInt(wrapper.css('marginTop'));
			
			if(margin > min) {
				if (settings.Orientation == "vertical")
				{				wrapper.stop().animate({
					"marginTop" : min
				}, 'fast', PositionChanged);
				}
					else if (settings.Orientation == "horizontal")
					{
										wrapper.stop().animate({
					'marginLeft' : min
				}, 'slow', PositionChanged);
					}
				

			} else if(margin < max) {
				if (settings.Orientation == "vertical")
				{
				wrapper.animate({
					"marginTop" : max
				}, 'fast', PositionChanged);
				}
				else if (settings.Orientation == "horizontal")
				{
									wrapper.stop().animate({
					"marginLeft" : max
				}, 'fast', PositionChanged);
				}
			}
		}

		this.ScrollTo = function(position) {
			if(settings.Orientation == "horizontal") {
				wrapper.stop(true).animate({
					'marginLeft' : position
				}, 'slow', PositionChanged);
			} else if(settings.Orientation == "vertical") {
				wrapper.stop(true).animate({
					'marginTop' : position
				}, 'slow', PositionChanged);
			}
		}
		
		this.ScrollToIndex = function(index) {
			if (index < 0 || index >= psArray.length)
				return;
				
			settings.CurrentPosition = index;
			ele.ScrollTo(psArray[settings.CurrentPosition]);
		}
				
		this.NextSlide = function() {
			var curPos = settings.CurrentPosition;
			ele.ScrollTo(psArray[curPos]);
			curPos++;
			if(curPos >= childCount)
				curPos = 0;
			settings.CurrentPosition = curPos;
			if (settings.Tabs)
				selectTab($(settings.Tabs[curPos]));
        }
        
		previousSlide() {
			var curPos = this.CurrentPosition;
			ele.ScrollTo(psArray[curPos]);
			curPos--;
			if(curPos < 0)
				curPos = settings.ChildCount - 1;
			settings.CurrentPosition = curPos;
			if (settings.Tabs)
				this.selectTab($(settings.Tabs[curPos]));
		}
		return this;
	}
}
*/