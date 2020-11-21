import { BoxMenu } from "./BoxMenu";

export class BoxMenuService {

    ele: BoxMenu;

    changeDirection: boolean = false;
    dirCase: number = 1;
    numChildren: number;
    patternPoints = [];
    patternCount: number; // ??

    constructor(ele: BoxMenu) {
        this.ele = ele;
    }

    bindElementEvents(index, ele, pos) {
        ele.bind("mouseenter", (e) => {
            let $this = $(e.target);
            event.stopPropagation();
            this.closeFollowing($this);
            pos = {
                x : $this.offset().left,
                y : $this.offset().top
            };
            if(this.ele.type != "all" && this.ele.type != "all-cascade") {
                this.showNextElement(index, $this, pos);
            }
        }).bind("mouseleave", function(e) {
            let $this = $(this);            
            if(index == 0) {
                if($this.nextAll(".open").length < 1) {
                    $this.removeClass("open").hide();
                }
            } else if($this.prevAll(".open").length < 1) {
                $this.removeClass("open").hide();
            }
        });
    }

    closeFollowing(ele) {
        ele.nextAll(".open").removeClass("open").hide();
    }

    closeOpenSiblings(listItem) {
        listItem.siblings().removeClass("open").each(function(index, element) {
            $(element).children().slice(1).removeClass("open").hide();
        });
    }

    closeOpenChildren(listItem) {
        listItem.children(".open").removeClass("open").hide();
    }

    showElement(index, ele: JQuery<HTMLElement>, pos) {
        var pre = ele.prev();
        //var x = pre.position().left;
        //var y = pre.position().top;
        ele.css({
            left : pos.x,
            top : pos.y,
            zIndex : parseInt(pre.css("zIndex")) - 1
        }).unbind("mouseenter mouseleave");

        pos.x += this.patternPoints[index].x;
        pos.y += this.patternPoints[index].y;

        ele.stop().show().animate({
            left : pos.x,
            top : pos.y
        }, this.ele.duration, () => {
            this.bindElementEvents(index, ele, pos);
        }).addClass("open");
    }

    showNextElement(index, ele, pos) {
        var next = ele.next();
        if(next.length > 0) {
            this.showElement(index + 1, next, pos);
        }
    }

    showAllCascade(index, ele, pos) {
        var pre = ele.prev();
        var x = pre.position().left;
        var y = pre.position().top;
        ele.css({
            left : pos.x,
            top : pos.y,
            zIndex : pre.css("zIndex") - 1
        });

        pos.x += this.patternPoints[index].x;
        pos.y += this.patternPoints[index].y;

        ele.stop().show().animate({
            left : pos.x,
            top : pos.y
        }, this.ele.duration, () => {
            var next = ele.next();
            if(next.length > 0) {
                this.showAllCascade(index + 1, next, pos);
            }
        }).addClass("open");
    }

    // TODO: Move to stategies
    createPatternPositions(index, pre) {
        switch (this.ele.pattern) {
            case "zigzag":
                if(pre && index != 0 && (index) % this.ele.span == 0) {
                    this.patternPoints[index] = {
                        x : pre.width(),
                        y : 0
                    };
                    this.changeDirection = !this.changeDirection;
                } else if(pre) {
                    if(!this.changeDirection) {
                        this.patternPoints[index] = {
                            x : 0,
                            y : pre.height()
                        };
                    } else {
                        this.patternPoints[index] = {
                            x : 0,
                            y : -pre.height()
                        };
                    }
                }
                break;
            case "square":
                if(index != 0) {
                    switch (this.dirCase) {

                        case 1:
                            // Right
                            this.patternPoints[index] = {
                                x : pre.width(),
                                y : 0
                            };
                            break;
                        case 2:
                            // Up
                            this.patternPoints[index] = {
                                x : 0,
                                y : -pre.height()
                            };
                            break;
                        case 3:
                            //Left
                            this.patternPoints[index] = {
                                x : -pre.width(),
                                y : 0
                            };

                            break;
                        case 4:
                            // Down
                            this.patternPoints[index] = {
                                x : 0,
                                y : pre.height()
                            };

                            break;

                    }
                    if((index + 1) % this.patternCount == 0) {
                        this.dirCase++;
                        if(this.dirCase == 2 || this.dirCase == 4) {
                            this.patternCount ++;
                        }
                        if(this.dirCase > 4) {
                            this.dirCase = 1;
                        }
                    }
                } else {
                    this.patternPoints[index] = {
                        x : 0,
                        y : pre.height()
                    };
                }
                break;
        }

    }

    init() {
        let $ele = $(this.ele);
		$ele.children().each((index, element) => {
			var listItem = $(element);
			var pos = {
				x : listItem.position().left,
				y : listItem.position().top + listItem.height() + 4
			};

			if(this.ele.pattern == "square" && !this.patternCount) {
				this.patternCount = 1;
			}

			listItem.children().first().css({
				position : "relative",
				zIndex : 100,
				width : this.ele.width,
				height : this.ele.height
			});
			listItem.children().slice(1).css({
				position : "absolute",
				width : this.ele.width,
				height : this.ele.height
			}).hide();

			listItem.children().slice(1).each((index, child) => {
				this.createPatternPositions(index, $(child).prev());
			});

			listItem.bind("mouseenter", () => {
				if(listItem.children().slice(1).hasClass("open")) {
					listItem.children().removeClass("open").slice(1).hide();
				} else {
					pos = {
						x : listItem.offset().left,
						y : listItem.offset().top
					};

					this.closeOpenSiblings(listItem);
					this.closeOpenChildren(listItem);

					if(this.ele.type == "all") {
						listItem.children().slice(1).each((index, child) => {
							this.showElement(index, $(child), pos);
						});
					} else if(this.ele.type == "all-cascade") {
						listItem.children().first().each((index, child) => {
							var next = $(child).next();
							if(next.length > 0) {
								this.showAllCascade(index, next, pos);
							}
						});
					} else if(this.ele.type == "cascade") {
						listItem.children().slice(1).each((index, child) => {
							if(index == 0) {
								this.showElement(index, $(child), pos);
							}

						});
					}

					listItem.addClass("open");
				}
			});
			listItem.bind("mouseleave", function() {
				if(!listItem.children().slice(1).hasClass("open")) {
					listItem.children().removeClass("open").slice(1).hide();
				}
			});
		});
    }

}