/*
 * Gantt plugin
 * Author: limodou@gmail.com
 * License: BSD
 */

(function ($) {
    "use strict";
    
    var settings = {
        months: ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"],
        dow: ["日", "一", "二", "三", "四", "五", "六"],
        scale : 'day',
        gridHeight: 450,
        treeField: 'name',
        treePanelWidth: 270,
        weekMidDay:3,
        cellWidth:24
    };
    
    /* 
     * 创建tooltip
     */
    function drawTooltip(){
        var d = $("div.gantt-tooltip");
        var div;
        if (d.size() == 0){
            div = d3.select('body')
                .append("div")
                .attr("class", "gantt-tooltip")
                .style("opacity", 0);
        }else{
            div = d3.select(d[0]);
        }
        return div;
    }
    
    /*
     * Default tooltip html output
     */
    function defaultTooltipHtml(d, opts){
        var s = ['任务: '+d.title,
            '开始时间: '+d.begin_date,
            '结束时间: '+d.end_date,
        ]
        
//        '实际开始时间: '+d.finish_begin_date,
//        '实际结束时间: '+d.finish_end_date,
//        '完成百分比: '+d.finish_percent+'%'
        
        return s.join('<br/>');
    }
    
    
    var tools = {
    
        getDayOfYear : function (date) {
            //取天的序号，1-365(366)
            var fd = new Date(date.getFullYear(), 0, 0);
            var sd = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            return Math.ceil((sd - fd) / 86400000);
        },
    
        getDayForWeek: function(date) {
            //取一周的中间一天,用于判断周的归属
            var df = new Date(date.valueOf());
            var gap = settings.weekMidDay - df.getDay();
            gap = gap>3 ? gap-7 : gap;
            return new Date(df.setDate(df.getDate() + gap));
        },
        
        getWeekOfYear: function(date) {
            var ys = new Date(date.getFullYear(), 0, 1);
            var sd = new Date(date.valueOf());
            var gap = settings.weekMidDay - ys.getDay();
            gap = gap>3 ? gap-7 : gap;
            if (gap > 0) {
                ys = new Date(ys.setDate(ys.getDate() + gap));
            } else {
                ys = new Date(ys.setDate(ys.getDate() + gap + 7));
            }
            var daysCount = tools.betweenDays(ys, sd);
            return Math.ceil(daysCount / 7) + 1;
        },
        
        getWeekId: function(date, fullId) {
            var weekDay = tools.getDayForWeek(date);
            var y = weekDay.getFullYear();
            var m = weekDay.getMonth();
            var week = tools.getWeekOfYear(weekDay);
            return fullId? y + "-W" + week : week;
        },
        
        getWeekRange: function(date) {
            var weekDay = tools.getDayForWeek(date);
            var from = new Date(weekDay.setDate(weekDay.getDate() - 3));
            var to = new Date(weekDay.setDate(weekDay.getDate() + 6));
            return from.getFullYear() + "-" + (from.getMonth()+1)+"-"+from.getDate() + "  -\n  " + 
                to.getFullYear()+ "-" + (to.getMonth()+1)+"-"+to.getDate()
        },
    
        formatDate: function(date) {
            if(!date) return "";
            var year = date.getFullYear();
            var month = (date.getMonth()+1);
            var day = date.getDate();
            month = (month<=9) ? "0" + month : month;
            day = (day<=9) ? "0" + day : day;
            return year + "-" + month + "-" + day;
        },
        
        dateDeserialize: function (dateStr) {
            if (!dateStr) return ;
            if (dateStr.search('/')>-1)
                return new Date(Date.parse(dateStr));
            else
                return new Date(Date.parse(dateStr.replace(/-/g,"/")));
        },
        
        betweenWeeks: function(from, to) {
            var current = new Date(from);
            var end = new Date(to);
            return Math.floor((end.getTime() - current.getTime())/ (3600*24000*7));
        },

        betweenDays: function(from, to) {
            var current = new Date(from);
            var end = new Date(to);
            return (end.getTime() - current.getTime())/ (3600*24000);
        },
        
        betweenMonths: function(from, to) {
            var current = new Date(from);
            var end = new Date(to);
            var month = (end.getFullYear() - current.getFullYear())*12
            month = month + (end.getMonth() - current.getMonth());
            return month
        },
        
        parseMonthsRange: function (from, to) {
            var current = new Date(from);
            var end = new Date(to);
            var ret = [];
            var i = 0;
            do {
                ret[i++] = new Date(current.getFullYear(), current.getMonth(), 1);
                current.setMonth(current.getMonth() + 1);
            } while (current.getTime() <= end.getTime());
            return ret;
        },
        
        parseWeeksRange: function(from, to) {
            var current = new Date(from);
            var end = new Date(to);
            var ret = [];
            var i = 0;
            do {
                if (current.getDay() === settings.weekMidDay) {
                    ret[i++] = tools.getDayForWeek(current);
                }
                current.setDate(current.getDate() + 1);
            } while (current.getTime() <= to.getTime());
            return ret;
        },
        
        parseDateRange: function (from, to) {
            var current = new Date(from);
            var end = new Date(to);
            var ret = [];
            var i = 0;
            do {
                ret[i++] = new Date(current.getTime());
                current.setDate(current.getDate() + 1);
            } while (current.getTime() <= end.getTime());
            return ret;
        },
        
        getGanttColumns: function(startDate, endDate, scale) {
            var cellWidth = settings.cellWidth;
            var cellScale = 1;
            var getOneCell = function(type, width, title, popTitle) {
                return "<div class='mmgantt-date-cell "+type + 
                    "' style='width:"+width+"px' title='" + (popTitle||title) + "'>" + 
                        title+"</div>";
            }
            
            if(scale == "week") {
                var range = tools.parseWeeksRange(startDate, endDate);
                var year = range[0].getFullYear();
                var month = range[0].getMonth();
                var yearArr = [], monthArr = [], weekArr = [];
                var weeksInYear = 0, weeksInMonth = 0;
                for (var i = 0; i < range.length; i++) {
                    var rday = range[i];
                    // Fill months
                    if (rday.getMonth() !== month) {
                        monthArr.push(getOneCell('month', cellWidth*weeksInMonth , settings.months[month])); 
                        month = rday.getMonth();
                        weeksInMonth = 0;
                    }
                    var getDay = rday.getDay();
                    // Fill years
                    if (rday.getFullYear() !== year) {
                        yearArr.push(getOneCell('year', cellWidth*weeksInYear, year)); 
                        year = rday.getFullYear();
                        weeksInYear = 0;
                    }

                    weeksInMonth++;
                    weeksInYear++;
                    weekArr.push(getOneCell('week', cellWidth, tools.getWeekId(rday), tools.getWeekRange(rday))); 
                } //For
                
                // Last month
                monthArr.push(getOneCell('month', cellWidth*weeksInMonth , settings.months[month])); 
                // Last year
                yearArr.push(getOneCell('year', cellWidth*weeksInYear, year)); 
                    
                var title = 
                    "<div class='mmgantt-date-row year'>"+yearArr.join("")+"</div>" +
                    "<div class='mmgantt-date-row month'>"+monthArr.join("")+"</div>" +
                    "<div class='mmgantt-date-row week'>"+weekArr.join("")+"</div>";
            } //of week
            
            if(scale == "day") {
                var range = tools.parseDateRange(startDate, endDate);
                var year = range[0].getFullYear();
                var month = range[0].getMonth();
                var day = range[0];
                var lastBeginDay = range[0];
                
                var yearArr = [], monthArr = [], dayArr = [], weekArr = [];
                var daysInYear = 0, daysInMonth = 0;
                
                for (var i = 0; i < range.length; i++) {
                    var rday = range[i];
                    var getDay = rday.getDay();
                    dayArr.push(getOneCell('day', cellWidth, rday.getDate()));
                    
                    // Fill months
                    if (rday.getMonth() !== month) {
                        monthArr.push(getOneCell('month', cellWidth*daysInMonth , settings.months[month])); 
                        month = rday.getMonth();
                        daysInMonth = 0;
                        lastBeginDay = rday;
                    }
                    daysInMonth++;
            
                    // Fill years
                    if (rday.getFullYear() !== year) {
                        yearArr.push(getOneCell('year', cellWidth*daysInYear, year)); 
                        year = rday.getFullYear();
                        daysInYear = 0;
                    }
                    daysInYear++;
                    
                } //for
                
                
                // Last month
                monthArr.push(getOneCell('month', cellWidth*daysInMonth , settings.months[month])); 
                // Last year
                yearArr.push(getOneCell('year', cellWidth*daysInYear, year)); 
                var title = 
                    "<div class='mmgantt-date-row year'>"+yearArr.join("")+"</div>" +
                    "<div class='mmgantt-date-row month'>"+monthArr.join("")+"</div>" +
                    "<div class='mmgantt-date-row day'>"+dayArr.join("")+"</div>";
            }
            
            if(scale == "month" || scale == "month3div" || scale == "month2div") {
                var range = tools.parseMonthsRange(startDate, endDate);
                var year = range[0].getFullYear();
                var month = range[0].getMonth();
                var day = range[0];
                var yearArr = [], monthArr = [], month3DivArr = [];
                var monthsInYear = 0;
                
                if( scale == "month") {cellWidth = cellWidth * 2}
                if( scale == "month2div") {cellScale = 2}
                if( scale == "month3div") {cellScale = 3}
                
                for (var i = 0; i < range.length; i++) {
                    var rday = range[i];
                    var label = settings.months[rday.getMonth()];
                    // Fill years
                    if (rday.getFullYear() !== year) {
                        if( scale == "month3div") {monthsInYear = monthsInYear * 3}
                        if( scale == "month2div") {monthsInYear = monthsInYear * 2}
                        yearArr.push(getOneCell('year', cellWidth*monthsInYear, year)); 
                        year = rday.getFullYear();
                        monthsInYear = 0;
                    }
                    monthsInYear++;
                    var label = settings.months[rday.getMonth()];
                    monthArr.push(getOneCell('month', cellWidth , label)); 
                }
                yearArr.push(getOneCell('year', cellWidth*monthsInYear, year)); 
                
                var title = 
                    "<div class='mmgantt-date-row year'>"+yearArr.join("")+"</div>" +
                    "<div class='mmgantt-date-row month'>"+monthArr.join("")+"</div>";
            }
            
            return [{
                'title': '日期',
                'titleHtml': title,
                'width': range.length*cellWidth*cellScale,
                'lockDisplay': true
            }]
        }
    
    }
    
    /* 
     * 创建甘特图对象
     */
    var Gantt = function(content, options) {
        var that = this;
        var element = $(content);
        this.element = element;
        this.opts = options;
        this.grid_opts = this.opts.grid;
        this.gantt_opts = this.opts.gantt;
        
        //初始化今天日期
        this.today = this.grid_opts.today;
        if(!this.today) {
            var today = new Date();
            this.today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        }
        this.scale = this.opts.gantt.scale;
        
        var template = [
            '<div class="gantttree-panel">',
                '<table class="gantttree"></table>',
            '</div>',
            '<div class="ganttgrid-panel">',
                '<table class="ganttgrid"></table>',
            '</div>',
            ].join("");
        element.html(template).addClass("gantt");
        this.gantt_panel = element.find('.ganttgrid-panel');
        this.grid_panel = element.find('.gantttree-panel');
        this.grid = this.grid_panel.find('table');
        this.gantt = this.gantt_panel.find('table');
        this.cellWidth = 24;
        this.barHeight = 16;
        this.finishBarHeight = 6;
        
        this.ganttData = [];    //甘特图数据，为数组
        this.ganttIds = {};     //甘特图数据的索引，key为id,值为数组的索引
        this.depends = [];      //任务间的依赖，一个依赖是一条记录，格式为一个数组
                                //[from, to] from为前置任务
                                //上面的数据，将在 _process_data() 中进行处理
        
        element.splitter({
                type: "v",
                outline: true,
                sizeLeft: '50%', //left size
                minLeft: 100,
                minRight: 100,
                resizeToWidth: true,
                dock: "right",
                dockSpeed: 50,
                cookie: "docksplitter",
                dockKey: 'Z',   // Alt-Shift-Z in FF/IE
                accessKey: 'I'  // Alt-Shift-I in FF/IE
            });
        
        //init
        this.initTreeGrid();
        
        //load data
        if(!this.grid_opts.items) {
            var that = this;
            $.ajax({
                type:"GET",
                url:that.grid_opts.url,
                data:[],
                dataType:"json",
                success:function(data){
                    var source = data[that.grid_opts.root];
                    that.grid.mmGrid("load", source);
                    var d = that._process_data(that.grid.mmGrid("rows", true));
                    that.getGanttRange(d);
                    that.initGanttGrid();
                    that.loadGanttData(d);
                    that.grid.trigger('resize');
                }
            });
        } else {
            var source = this.grid_opts.items;
            this.grid.mmGrid("load", source);
            var d = this._process_data(this.grid.mmGrid("rows", true));
            this.getGanttRange(d);
            this.initGanttGrid();
            this.loadGanttData(d);
            this.grid.trigger('resize');
        }
        
    }
    
    /*
     * Gantt class
     */
    Gantt.prototype = {
    
        constructor: Gantt
        
        , initTreeGrid: function() {
            var that = this;
            
            /* 装入grid数据时，同时对日期进行格式化 */
            var expandFilter = function(data, parentId) {
                for(var i=0; i<data.length; i++) {
                    that._convert_date(data[i]);
                    var x = this.getBarInfo(data[i].beginTime, data[i].endTime);
                }
                
                if(parentId) {
                    //redraw ganttgrid
                    that.appendRows(element, data, parentId);
                }
                return data;
            };
            
            var grid_settings = {
                nowrap: true,
                fitColWidth: true,
                height: '100%',
                expandURL: this.grid_opts.url,
                expandMethod: 'POST',
                expandFilter: expandFilter,
                autoLoad: false,
                clickableNodeNames: false
            }
            
            var settings = $.extend(true, this.grid_opts, grid_settings);
            var mmgrid = this.grid.mmGrid(settings);
            mmgrid.on("expand", function(e, row) {
                that.onExpandHandler(row.id);
            });
            mmgrid.on("collapse", function(e, row) {
                that.onCollapseHandler(row.id);
            });
            var events = ['added', 'updated', 'deleted', 'indented', 
                'unindented', 'upped', 'collapsed', 'expanded']
            $.each(events, function(index, v){
                mmgrid.on(v, function(e, data){
                    that.redrawGantt();
                });
            });
            
        }
        , _cal_pos: function(data){
            //计算计划开始，结束时间的：偏移量和宽度
            var x = this.getBarInfo(data.beginTime, data.endTime);
            data.width = x.width;
            data.margin = x.margin;
            //计算实际开始，结束时间的：偏移量和宽度
            var y = this.getBarInfo(data.startTime, data.doneTime);
            //如果宽度为0，表示没有结束，则使用百分比来计算宽度
            if (y.width == 0)
                y.width = x.width * data.finish_percent / 100;
            data.finish_width = y.width;
            data.finish_margin = y.margin-x.margin;
        }
        /*
         * 生成一个菱形的path信息
         */
        , _drawDiamond: function(x, y, w, h){
            var w2 = w/2;
            var h2 = h/2;
            var s = ['M', x, y, 'l', w2, h2, 'l', -w2, h2, 'l', -w2, -h2, 'z'];
            return s.join(" ");
        }
        
        , drawGrid: function(d, x1, y1){
            var w = this.draw.attr('width');
            var h = this.draw.attr('height');
            
            x1 = x1 || 0;
            y1 = y1 || 0;
            var x = d3.scale.linear().domain([0, w/d]);

            var nodes = this.draw.selectAll('line.xline')
                .data(x.ticks(w/d));

            nodes
                .attr('x1', function(i){return i*d-0.5+x1;})
                .attr('y1', y1)
                .attr('x2', function(i){return i*d-0.5+x1;})
                .attr('y2', h+y1);

            //draw y line
            nodes.enter()
                .append('line')
                .attr('class', 'xline')
                .attr('x1', function(i){return i*d-0.5+x1;})
                .attr('y1', y1)
                .attr('x2', function(i){return i*d-0.5+x1;})
                .attr('y2', h+y1);

            nodes.exit().remove();

        }

        /*
         * 画任务之间的线
         * 格式为 [(from, to), ...]
         * 其中from为起始任务的序号-1， to为结束任务的序号-1
         * h 为每行的高度
         */
        , drawLines: function(h){
            var that = this;
            var top = (h - that.barHeight)/2;
            
            var lines = this.draw.selectAll('g.lines')
                .data(this.depends, function(d){return d[0]+','+d[1];});
                
            function _line(from, to){
                var s;
                var b = that.ganttData[from];
                var e = that.ganttData[to];
                var x = b.margin + b.width;
                var y = from * h + h/2;
                var y2 = to * h + 0.5;   //任务2起始纵坐标
                var e_begin;
                //如果上个任务结束时间小于下个任务，则直接画线
                //todo 是否考虑下个任务的开始时间可以向前几天？
                if (e.type == '1')
                    e_begin = e.beginTime;
                else
                    e_begin = e.endTime;
                if (b.endTime < e_begin){
                    s = ['M', x, y, 'H', e.margin-0.5, 'V', y2+top-3];
                }else {
                    s = ['M', x, y, 'h', 2.5, 'V', y2, 'L', e.margin-6.5, y2, 'L', e.margin-6.5, to*h+top+that.barHeight/2-0.5];
                }
                return s.join(" ");
            }
            
            function _triangle(from, to){
                var s;
                var b = that.ganttData[from];
                var e = that.ganttData[to];
                var top = (h - that.barHeight)/2;
                var y2 = to * h ;   //任务2起始纵坐标
                var e_begin;

                if (e.type == '1')
                    e_begin = e.beginTime;
                else
                    e_begin = e.endTime;
                
                if (b.endTime < e_begin){
                    s = ['M', e.margin-0.5, y2+top-3, 'h', 3, 'l', -3, 3, 'l', -3, -3, 'h', 3];
                }else{
                    s = ['M', e.margin-6.5, to*h+top+that.barHeight/2, 
                        'h', 3, 'v', -3, 'l', 3, 3, 'l', -3, 3, 'v', -3];
                }
                return s.join(" ");
            }
            
            var gs = lines.enter().append('g')
                .attr('class', 'lines');
                
            lines.each(function(d, i) {
                var t = d3.select(this);
                t.selectAll(".line")
                    .transition()
                    .attr("d", function(d){return _line(d[0], d[1]);})
                    .duration(300);
                t.selectAll(".triangle")
                    .transition()
                    .attr("d", function(d){return _triangle(d[0], d[1]);})
                    .duration(300);
            });
            
            //画线
            gs.append('path')
                .attr('class', 'line')
                .attr('d', function(d){return _line(d[0], d[1]);});
                
            //画三角
            gs.append('path')
                .attr('class', 'triangle')
                .attr('d', function(d){return _triangle(d[0], d[1]);});
                
            lines.exit()
                .remove();
        }
        , redrawGantt: function(){
            this.grid.trigger('resize');
            
            //下一步很重要，重新绑定draw对象，在initGanttGrid中的处理对闭包无效
            //感觉redrawGantt是在事件中调用的，所以this还是旧的
            this.draw = d3.select(this.gantt_panel.find('svg')[0]);
            this.draw
                .attr('width', parseInt(this.gantt.get(0).style.width))
                .attr('height', this.grid.height());
            var data = this._process_data(this.grid.mmGrid("rows", true));
            this.drawGantt(data);
        }
        , drawGantt: function(data){
            var that = this;
            var h = this.grid.find('tr').height();
            var top = (h - this.barHeight)/2;
            var top_diamond = (h - 12)/2;
            
            //画父阶段需要的变量
            var bar_h = this.barHeight; //总高度
            var group_h = 7;            //小三角的起始位置
            var d_h = bar_h-group_h;    //小三角的直角边长
            
            var finish_bar_top = (h - this.finishBarHeight)/2 - top; 
            
            //处理结点update
            //data 的key为id+类型+是否父结点
            var bar = this.draw.selectAll("g.node")
                .data(data, function(d, i){
                    that._cal_pos(d);
                    return d.id+','+d.type+','+d.group;
                });
                
            //更新
            bar.each(function(d, i) {
                var t = d3.select(this);
                t.attr('class', 'node')
                t.transition().duration(300)
                    .attr("transform", "translate(" + d.margin + "," + (i * h + top) + ")");
                
                //如果是阶段
                if (d.type == '1'){
                    if (!d.group){
                        t.selectAll("rect.ganttBar")
                            .transition()
                            .attr("width", d.width)
                            .attr("class", 'ganttBar '+d.color)
                            .duration(300);
                        t.selectAll("rect.finish-ganttBar")
                            .transition()
                            .attr("width", d.finish_width)
                            .attr("x", d.finish_margin)
                            .duration(300);
                    }else{
                        t.selectAll("rect")
                            .transition()
                            .attr("width", d.width)
                            .duration(300);
                        t.selectAll("path.right-angle")
                            .transition()
                            .attr("d", ['M', d.width, group_h, 'l', 0, d_h, 'l', -d_h, -d_h, 'z'].join(" "))
                            .duration(300);
                    }
                }else{
                    t.selectAll("text")
                        .text(d.end_date);
                    t.selectAll("path")
                        .attr("color", function(d) {return 'milestone '+d.color});
                }
            })  
            
            //添加
            var nodes = bar.enter()
                .append("g")
                    .attr("transform", function(d, i) { 
                        return "translate(" + d.margin + "," + (i * h + top) + ")"; })
                    .attr("class", "node");
                
            //添加里程碑
            var milestones = nodes.filter(function(d){return d.type=='2';});
            
            milestones
                .append('path')
                    .attr("d", function(d){return that._drawDiamond(0, 0, 12, 12);})
                    .attr("class", function(d) {return 'milestone '+d.color})
                    .on("mouseover", function(d){return that._tooltip_mouseover(d);})
                    .on("mouseout", this._tooltip_mouseout)
                    .on("click", function(d){return that.onTaskClickHandler(d);});
                    
            //添加里程碑文字
            //todo 是否有更好的方式和里程碑一起添加？
            milestones
                .append('text')
                    .attr("x", 14)
                    .attr("y", top_diamond)
                    .attr("dy", ".35em")
                    .text(function(d) {return d.end_date;});

            //添加普通阶段
            var normals = nodes.filter(function(d){return d.type=='1' && !d.group;});
            
            //添加计划条
            normals
                .append('rect')
                    .attr("width", function(d){ return d.width;})
                    .attr("height", this.barHeight)
                    .attr("rx", 3).attr("ry", 3)
                    .attr("class", function(d) {return 'ganttBar '+d.color})
                    .on("mouseover", function(d){return that._tooltip_mouseover(d);})
                    .on("mouseout", this._tooltip_mouseout)
                    .on("click", function(d){return that.onTaskClickHandler(d);});
                    
            //添加实际完成条
            normals
                .append('rect')
                    .attr("y", finish_bar_top)
                    .attr("x", function(d){return d.finish_margin;})
                    .attr("width", function(d){ return d.finish_width;})
                    .attr("height", this.finishBarHeight)
                    .attr("class", 'finish-ganttBar');
                    
            
            //添加父阶段
            var phrase = nodes.filter(function(d){return d.type=='1' && d.group;});
            
            phrase
                .append('rect')
                    .attr("width", function(d){ return d.width;})
                    .attr("height", group_h+1)
                    .on("mouseover", function(d){return that._tooltip_mouseover(d);})
                    .on("mouseout", this._tooltip_mouseout)
                    .on("click", function(d){return that.onTaskClickHandler(d);});
            phrase
                .append('path')
                .attr('d', ['M', 0, group_h, 'l', 0, d_h, 'l', d_h, -d_h, 'z'].join(" "))
                .attr('class', 'left-angle');
                
            phrase
                .append('path')
                .attr('d', function(d){return ['M', d.width, group_h, 'l', 0, d_h, 'l', -d_h, -d_h, 'z'].join(" ");})
                .attr('class', 'right-angle');
            
            //删除
            bar.exit().remove();
            
            //画线
            this.drawLines(h);
            
        }
        
        , _tooltip_mouseover: function(d){
            var div = drawTooltip();
            var formatTime = d3.time.format("%e %B");
            var _html;
            
            if (this.gantt_opts.tooltipHtml)
                _html = this.gantt_opts.tooltipHtml;
            else
                _html =  defaultTooltipHtml;
            
            div.transition()
                .duration(200)
                .style("opacity", .9);
            div.html(_html(d, this.gantt_opts))
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
            
        }
        
        , _tooltip_mouseout: function(d){
            var div = drawTooltip();
        
            div.transition()
                .duration(500)
                .style("opacity", 0);
            
        }

        , onTaskClickHandler: function(d){
            this.grid.mmGrid('select', this.ganttIds[d.id]);
        }
        
        , appendRows: function(childData, parentId) {
            var childData2 = [];
            $.extend(true, childData2, childData);
            var mmgrid = this.gantt.mmGrid();
            var parent = mmgrid.findItem(parentId);
            mmgrid.addChild(childData, parent);
        }
        
        , onExpandHandler: function(rowId) {
            this.grid.mmGrid('expandById', rowId);
        }
        
        , onCollapseHandler: function(rowId) {
            this.grid.mmGrid('collapseById', rowId);
        }
        
        , onClickHandler: function(rowObj) {
            if(this.gantt_opts.onClickHandler) {
                this.gantt_opts.onClickHandler.call(rowObj);
            }
        }
        
        , addSyncScrollEvent: function() {
            //两个grid同步滚动
            var that = this;
            var gridview = this.gantt;
            var gridcontainer = gridview.parent().parent();
            //增加今日提示
            var leftMargin = this.getLeftMargin();
            gridcontainer.append("<div class='gantt-today-marker' style='z-index:100;left:"+leftMargin+"px'><div>今日</div></div>");
            
            var treeview = this.grid;
            var treecontainer = treeview.parent().parent();
            
            gridview.parent().unbind(".mmg-bodyWrapper").bind("scroll.mmg-bodyWrapper",function(){
                treeview.parent().scrollTop($(this).scrollTop());
                gridcontainer.children("div.gantt-today-marker").css({'left':leftMargin-$(this).scrollLeft()});
            });
            treeview.parent().unbind(".mmg-bodyWrapper").bind("scroll.mmg-bodyWrapper",function(){
                gridview.parent().scrollTop($(this).scrollTop());
            });
//            gridview.delegate(".ganttBarDiv", "click", function(e){
//                if($(this).children().length>0) {
//                    var rowId = $(this).attr("objid")
//                    var mmGrid = that.gantt;
//                    var objData = mmGrid.row(mmGrid.findItem(rowId))
//                    core.onClickHandler(objData);
//                }
//            });
//            gridview.delegate(".ganttBar,.ganttBar2", "mouseover", function(e){
//                if($(this).parent().children().length>0) {
//                    var rowId = $(this).parent().attr("objid")
//                    var mmGrid = that.gantt;
//                    var objData = mmGrid.row(mmGrid.findItem(rowId))
//                    if(objData.ganttDesc) {
//                        var hint = $('<div class="fn-gantt-hint" />').html(objData.ganttDesc);
//                        $("body").append(hint);
//                        hint.css("left", e.pageX + 5);
//                        hint.css("top", e.pageY + 5);
//                        hint.show();
//                    }
//                }
//            });
//            gridview.delegate(".ganttBar,.ganttBar2", "mouseout", function(e){
//                if($(this).parent().children().length>0) {
//                    $(".fn-gantt-hint").remove()
//                }
//            });
        }
        
        /*
         * 初始生成甘特图表格
         * 当选择了不同的时间维度，可能表头及数据会发生变化
         */
        , initGanttGrid: function() {
            var columns = tools.getGanttColumns(this.startDate, this.endDate, this.scale);
            var grid_settings = {
                cols: columns,
                nowrap: true,
                treeColumn: this.grid_opts.treeColumn,
                fitColWidth: true,
                idField: 'id',
                height: '100%',
                showBackboard: false,
                autoLoad: false,
                expandable: true
            }
            this.gantt_panel.html('<table class="ganttgrid"></table>');
            this.gantt = this.gantt_panel.find('table');
            this.element.removeClass("gantt-scale-month gantt-scale-month2div gantt-scale-month3div");
            this.element.removeClass("gantt-scale-day gantt-scale-week");
            this.element.addClass("gantt-scale-"+this.scale);
            
            var settings = $.extend(true, this.gantt_opts, grid_settings);
            this.gantt.mmGrid(settings);
            
            this.gantt.hide();
            this.gantt2 = $('<div>');
            this.gantt_panel.find('.mmg-bodyWrapper').append(this.gantt2);
            //初始化d3 svg
            this.draw = d3.select(this.gantt2.get(0)).append('svg');
        }
        
        , _process_data: function(source){
            var data = [];
            var ids = {};
            var depends = [];
            var x;
            var opts = this.gantt_opts;
            var that = this;
            
            $.each(source, function(index, d){
                x = {};
                x['begin_date'] = d[opts.planBeginDateName];
                x['end_date'] = d[opts.planEndDateName];
                x['finish_begin_date'] = d[opts.realBeginDateName];
                x['finish_percent'] = d[opts.finishPercentName],
                x['finish_end_date'] = d[opts.realEndDateName];
                that._convert_date(x);
                x['id'] = d.id;
                x['title'] = d[opts.titleName];
                
                if (opts.group){
                    if ($.isFunction(opts.group))
                        x['group'] = opts.group(d);
                    else
                        x['group'] = d[opts.group];
                }else
                    x['group'] = false;
                    
                if (opts.type){
                    if ($.isFunction(opts.type))
                        x['type'] = opts.type(d);
                    else
                        x['type'] = d[opts.type];
                }else
                    x['type'] = '1';
                if (opts.color){
                    if ($.isFunction(opts.color))
                        x['color'] = opts.color(d) || '';
                    else
                        x['color'] = d[opts.color];
                }else
                    x['color'] = '';
                
                //处理依赖
                var de_ids = d[opts.dependTaskName];
                if (de_ids){
                    //k应该是序号，从1开始
                    for(var i=0; i<de_ids.split(',').length; i++){
                        var k = parseInt(de_ids[i]);
                        if (k && k>0 && k<=source.length){
                            depends.push([k-1, data.length]);
                        }
                    }
                }
                data.push(x);
                
                ids[x.id] = data.length - 1;
            });
            
            this.ganttData = data;
            this.ganttIds = ids;
            this.depends = depends;
            
            return data;
        }
        , loadGanttData: function(data, refresh) {
            this.grid.trigger('resize');
            this.draw
                .attr('width', parseInt(this.gantt.get(0).style.width))
                .attr('height', this.grid.height());
            var w = this.cellWidth;
            if (this.scale == 'month')
                w = 2*w;
            this.drawGrid(w);
            this.drawGantt(data);
            this.addSyncScrollEvent();
        }
            
        , toToday: function() {
            var container = this.grid.parent().parent();
            var left = parseInt(container.children("div.gantt-today-marker").css('left'),10)
            container.children(".mmg-bodyWrapper").scrollLeft(container.children(".mmg-bodyWrapper").scrollLeft()+left-30);
        }
            
        , redraw: function(scale) {
            var data = this._process_data(this.grid.mmGrid("rows", true)); 
            this.scale = scale;
            
            this.getGanttRange(data);
            this.initGanttGrid();
            this.loadGanttData(data);
        }
        
        , _convert_date: function(data){
            var opts = this.gantt_opts;
            
            data.beginTime = tools.dateDeserialize(data[opts.planBeginDateName]);
            data.endTime = tools.dateDeserialize(data[opts.planEndDateName]);
            if (data[opts.realBeginDateName]) {
                data.startTime = tools.dateDeserialize(data[opts.realBeginDateName]);
            }
            if (data[opts.realEndDateName]) {
                data.doneTime = tools.dateDeserialize(data[opts.realEndDateName]);
            }
        }
                
        , getMaxDate: function(data) {
            var maxDate = null;
            for(var i=0; i<data.length; i++) {
                maxDate = maxDate < data[i].endTime ? data[i].endTime : maxDate;
            }
            maxDate = maxDate < this.today ? new Date(this.today.getTime()) : new Date(maxDate.getTime());
            switch (this.scale) {
                case "day":
                    maxDate.setDate(maxDate.getDate() + 3);
                    break;
                case "week":
                    maxDate.setDate(maxDate.getDate() + 7*3);
                    break;
                case "month2div":
                case "month3div":
                    var bd = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
                    bd.setMonth(bd.getMonth() + 1);
                    maxDate = new Date(bd.getFullYear(), bd.getMonth(), 1);
                    break;
                case "month":
                    var bd = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
                    bd.setMonth(bd.getMonth() + 2);
                    maxDate = new Date(bd.getFullYear(), bd.getMonth(), 1);
                    break;
                default:
                    maxDate.setDate(maxDate.getDate() + 3);
                    break;
            }
            return maxDate;
        }
        
        , getMinDate: function(data) {
            var minDate = null;
            for(var i=0; i<data.length; i++) {
                minDate = minDate > data[i].beginTime || minDate === null ? data[i].beginTime : minDate;
            }
            minDate = minDate > this.today || minDate === null ? new Date(settings.today.getTime()) : new Date(minDate.getTime());
            switch (this.scale) {
                case "day":
                    minDate.setDate(minDate.getDate() - 3);
                    break;
                case "week":
                    minDate.setDate(1);
                    break;
                case "month2div":
                case "month3div":
                    var bd = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
                    bd.setMonth(bd.getMonth() - 1);
                    minDate = new Date(bd.getFullYear(), bd.getMonth(), 1);
                    break;
                case "month":
                    var bd = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
                    bd.setMonth(bd.getMonth() - 2);
                    minDate = new Date(bd.getFullYear(), bd.getMonth(), 1);
                    break;
                default:
                    minDate.setDate(minDate.getDate() - 3);
                    break;
            }
            return minDate;
            
        }
        
        , getGanttRange: function(data) {
            //todo 最大时间和最小时间是否可以优化
            this.startDate = this.getMinDate(data);
            this.endDate = this.getMaxDate(data);
        }
        
        /* 获得时间段的坐标 */
        , getBarInfo: function(startDate, endDate) {
            var cellWidth = this.cellWidth;
            var scale = this.scale;
            if( scale == "month") {cellWidth = cellWidth * 2}
            
            var startDateX = startDate;
            var endDateX = endDate;
            var barMargin = 0;
            var barWidth = 0;
            var betweenFn;
    
            if(scale == "week") {
                if (startDate)
                    startDateX = tools.getDayForWeek(startDate);
                if (endDate)
                    endDateX = tools.getDayForWeek(endDate);
                betweenFn = tools.betweenWeeks;
            }
            if(scale == "day") {
                betweenFn = tools.betweenDays;
            }
            if(scale == "month") {
                betweenFn = tools.betweenMonths;
            }
    
            if (startDateX && endDateX)
                barWidth = betweenFn(startDateX, endDateX)*cellWidth+cellWidth-8;
            else
                barWidth = 0;
            //如果是阶段，则开始结束时间都有，计算开始时间偏移量
            if (this.startDate && startDateX)
                barMargin = betweenFn(this.startDate, startDateX)*cellWidth;
            //否则计算结束时间偏移量
            else if (this.startDate && endDateX)
                barMargin = betweenFn(this.startDate, endDateX)*cellWidth;;
            
            return {width:barWidth, margin:barMargin}
        }
        
        , getLeftMargin: function() {
            var cellWidth = this.gantt_opts.cellWidth;
            if(this.scale == 'day') {
                return tools.betweenDays(this.startDate, this.today)*cellWidth + cellWidth - 4;
            }
            if(this.scale == 'week') {
                return tools.betweenWeeks(tools.getDayForWeek(this.startDate), tools.getDayForWeek(this.today)) * cellWidth + 22;
            }
            if(this.scale == 'month') {
                cellWidth = cellWidth * 2;
                return tools.betweenMonths(this.startDate, this.today) *cellWidth + cellWidth - 4;
            }
            return 50;
        }
        
        , getGrid: function() {
            return this.grid;
        }
        
    }
    
    $.fn.gantt = function () {
        if(arguments.length === 0 || typeof arguments[0] === 'object'){
            var option = arguments[0]
                , data = this.data('gantt')
                , options = $.extend(true, {}, $.fn.gantt.defaults, option);
            if (!data) {
                data = new Gantt(this, options);
                this.data('gantt', data);
            }
            return $.extend(true, this, data);
        }
        if(typeof arguments[0] === 'string'){
            var data = this.data('gantt');
            var fn =  data[arguments[0]];
            if(fn){
                var args = Array.prototype.slice.call(arguments);
                return fn.apply(data,args.slice(1));
            }
        }
    }
    
    $.fn.gantt.defaults = {
        grid:{}
        , gantt:{
            months: ["一月", "二月", "三月", "四月", "五月", "六月", 
                "七月", "八月", "九月", "十月", "十一月", "十二月"]
            , dow: ["日", "一", "二", "三", "四", "五", "六"]
            , scale : 'day'
            , gridHeight: 450
            , treeField: 'name'
            , treePanelWidth: 270
            , weekMidDay:3
            , toolbar: null
            , planBeginDateName: 'begin_date'
            , planEndDateName: 'end_date'
            , realBeginDateName: 'finish_begin_date'
            , realEndDateName: 'finish_end_date'
            , finishPercentName: 'percent'
            , dependTaskName: 'pre_task'
            , titleName: 'title'
            , type: 'type'  //区分是否阶段还是里程碑，对于里程碑，只需要结束时间
                            //它的取值分别为 '1'阶段,'2'里程碑
                            //如果是一个函数，则传入对应Grid的数据，则函数进行判断返回'1'或'2'
                            //如： function(d){'1'?d.type=='1':'2'}
            , color: null   //可以在gantt上显示不同的颜色的class,它是一个回调函数，如：
                            //function(d){'red'?d.status=='error':'green'}
            , group: null   //用来标记是否是group元素，可以是一个函数
            , tooltipHtml: null //回调函数，用来显示tooltip的文本，格式为 function (d){return html;}
                            //d为正在处理的数据项，如果不提供则使用缺省的显示
        }
    }
    
    $.fn.gantt.Constructor = Gantt;

})(jQuery)


