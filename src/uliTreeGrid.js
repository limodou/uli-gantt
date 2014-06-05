/*
 * Inspired from treeTable plugin
 * Author: limodou@gmail.com
 * License: BSD
 */

!(function($) {

    treegrid = {
        defaults: {
            parentAttrName: 'parent',  //保存父结点id值使用的属性名
            clickableNodeNames: false,  //点击名称是否可以切換展示或折叠状态
            expandable: true, //如果为false，则不能折叠或展开
            defaultPaddingLeft: 6,
            indent: 16,     //每级缩近的宽度值
//            initialState: "collapsed",
            treeColumn: 0,  //可以是字段名
            //fieldTarget: 'div.mmg-cellWrapper div', //每个单元格的第一个子元素标签名，在生成每个单元格时要与此一致
            fieldTarget: 'div.mmg-cellText, div.mmg-cellWrapper', //每个单元格的第一个子元素标签名，在生成每个单元格时要与此一致
            persist: false, //是否将折叠状态保存在cookie中
            persistCookiePrefix: 'treeTable_',
            persistCookieOptions: {},
            stringExpand: "Expand", //展开按钮的中文提示
            stringCollapse: "Collapse", //折叠按钮的中文提示
            idField: 'id',  //用来定义数据中主键key
            keyAttrName: 'id',  //将主键key写到tr元素时使用的属性名称
            parentField: '_parent',  //用来在数据中标识父结点的字段名
            bind: false,        //是否启用数据绑定功能，如果启动则在数据发生变化时会主动调用处理函数
            bindHandler: null,  //数据绑定处理函数，如果bind为true，此值为空，则使用缺省处理函数
            bindExtraData: null, //返回与编辑处理相关的额外数据function(action, result, data, el){}
            readonly: true,  //如果是只读，则不能进行add, remove, indent, unindent等编辑操作
            orderingField: 'ordering',   //ordering用来保持每条的顺序号
            showMessage: null,   //显示消息的函数,
            cssRender:null,      //返回tr对应的css回调函数
            showIcon: false,    //树列显示图标
            iconIndent: 16,     //图标的宽度
            expandMethod: 'GET',//自动展开子结点ajax请求方式
            expandParam: 'id',  //自动展开子结点ajax请求参数名
            expandArgs: null, //expand参数获取回调，将与param合并发送后台，应return一个object
            expandFilter: null, //自动展开数据预处理
            expandURL: null,    //自动展开子结点URL
            
            multiSelectKey: ''    //多选快捷键模式，取值可以是 shift, alt, ctrl
        },
        
        _init: function(){
            var $self = this;
            //初始化树展示结点
            this.$treeColumnIndex = this._getColumnIndex(this.opts.treeColumn)
        }
        
        , methods: {
            /*
                返回表格总条数
            */
            count: function (){
                return this.$count;
            }
            
            /*
                返回当前结点的level值
            */
            , _level: function (node){
                return parseInt(node.attr('level') || 0);
            }
            /*
                数据格式为 {}或数组，其中如果数据中有 _isParent 则表示树结点
                _children 为 [] ，是当前结点的子结点
                index为指定的父结点，或者为序号或者为tr元素
                如果index为0，则插入最前面
                如果index为undefined，则表示自动判断数据中是否有父结点，自动按父结点
                来进行父子关系处理。则否视为0的效果。所以，如果数据中有父结点，但是
                不想以父结点方式来插入（子结点），则应指定index为插入位置，同时设
                置合适的position值。
                如果为undefined或null，则添加到最后
                position为插入的位置：before为向前插入， after为向后插入,
                last为在存在父结点时，插入到子结点的最后，如果无父结点则和after一样
                为每个结点添加一个level的值，这样后续计划缩近时可以使用这个值
                第一级为0
            */
            , _add : function(item, index, isChild, position){
                var $tbody = this.$tbody;
                var nodes = [];
                var pos;
                var event_type;
                if (this.EventExpand)
                    event_type = 'added.expand';
                else
                    event_type = 'added';
                
                position = position || 'after';
                
                //如果是数组，则按同组结点进行处理
                if($.isArray(item)){
                    for(var i=0; i < item.length; i++){
                        if(i == 0) pos = position;
                        else pos = 'last';
                        var d = this._add(item[i], index, isChild, pos);
                        nodes.push(d);
                    }
                    return nodes;
                }
                
                if(!$.isPlainObject(item)){
                    return ;
                }
                
                var $tr;
                var length;
                var e;
                var parent;
                var children;
                var next;
                
                $tr = $(this._rowHtml(item));
                $tr.attr('level', 0);
                $tr.data('item', item);
                
                //无数据直接追加
                if(this.count() == 0){
                    e = this._trigger(this.$body, 'add', item);
                    if(e.isDefaultPrevented()) return;
                    this._hideNoData();
                    this._removeEmptyRow();
                    $tbody.append($tr);
                    this._trigger($tr, event_type, item);
                }
                else{
                    //如果定义了父结点值，查找父结点是否存在，如果不存在则抛出错误
                    if (index===undefined && item[this.opts.parentField]){
                        parent = this.findItem(item[this.opts.parentField]);
                        if (!parent){
                            this._trigger(this.$body, {type:'error',
                                message:"can't find parent node"},
                                item);
                            return ;
                        }
                        isChild = true;
                    }
                    
                    node = this._get_item(index);
                    
                    //如果定义了isChild则不再判断position
                    if(isChild){
                        if (!parent) parent = node;
                    }else{
                        e = this._trigger(this.$body, 'add', item);
                        if(e.isDefaultPrevented()) return;
                        
                        //没找到则直接插入
                        if (!node) {
                            $tbody.append($tr);
                        }else{
                            //根据postion的指示插入结点
                            if (position == 'after' || position == 'last'){
                                next = this.getNext(node);
                                if (next){
                                    next.before($tr);
                                }
                                else
                                    $tbody.append($tr);
                            }else{
                                node.before($tr);
                            }
                            var p = this.getParent(node);
                            if (p){
                                var key = p.attr(this.opts.keyAttrName);
                                this._setParentValue($tr, key);
                                $tr.attr('level', this._level(p)+1);
                            }
                        }
                        
                        this._trigger($tr, event_type, item);
                        
                    }
                }
                
                //如果有父结点，则处理父结点的样式
                if (parent){
                    e = this._trigger(this.$body, 'add', item);
                    if(e.isDefaultPrevented()) return;
                    
                    //如果position为last，则插入到子结点的最后
                    if(position == 'last'){
                        /*
                        var children = this.getChildren(parent);
                        if(children.length > 0){
                        */
                        if(this.hasChildren(parent)){
                            //next = this.getNext($(children[children.length-1]));
                            next = this.getNext(parent);
                            if (next){
                                next.before($tr);
                            }
                            else
                                $tbody.append($tr);
                        }
                        else parent.after($tr);
                    }
                    else
                        parent.after($tr);
                    
                    //设置父结点的loaded状态为true，表示已经做过expand的处理
                    parent.data('loaded', true);
                    
                    this._trigger($tr, event_type, item);
                    
                    var key = parent.attr(this.opts.keyAttrName);
                    this._setParentValue($tr, key);
                    $tr.attr('level', this._level(parent)+1);
                    
                    this.updateStyle(parent, true);
                }
                
                this.$count ++;
                
                //处理子结点
                if (item._children){
                    nodes = this._add(item._children, $tr, true, position);
                    if (nodes){
                        if($.isArray(nodes)){
                            for(var i=0; i<nodes.length; i++){
                                this.updateStyle(nodes[i], false);
                            }
                        }else this.updateStyle(nodes, false);
                    }
                    this.updateStyle($tr, true);
                }else
                    this.updateStyle($tr, false);
                
                return $tr
            }
            
            /*
                根据id值找到对应的元素对象
            */
            , findItem: function(id){
                var $body = this.$body;
                var trs = $body.find('tbody tr['+this.opts.keyAttrName+'="'+id+'"]');
                if (trs.length > 0)
                    return trs
                return ;
            }
            
            /*
                根据id值找到对应的元素对象
            */
            , findIndexById: function(id){
                var $body = this.$body;
                var trs = $body.find('tbody tr['+this.opts.keyAttrName+'="'+id+'"]');
                if (trs.length > 0)
                    return trs.index();
                return -1;
            }
            
            /*
                批量插入结点， notfinished表示是否处理完毕，此
                函数将支持多次插入
            */
            
            , _populate: function(items, append, notfinished){
                var opts = this.opts;
                var $body = this.$body;
                var $tbody = this.$tbody;
                this._initing = true;   //初始化标志
                var replace = false;
                var has_body = $tbody.size() > 0;
                
                if (!has_body || (!append && has_body))
                    replace = true;
                
                this._hideMessage();
                if(items && items.length !== 0 && opts.cols){
                    if (replace){
                        this.$tbody = $tbody = $body.empty().html('<tbody></tbody>');
                    }
                    $tbody.hide();
                    this.add(items, undefined, 'last');
                    $tbody.show();
                }else{
                    if (replace){
                        this._insertEmptyRow();
                        this._showNoData();
                    }
                }

                this._hideLoading();
                if (!notfinished){
                    this._setStyle();

                    if(opts.fullWidthRows && this._loadCount <= 1){
                        this._fullWidthRows();
                    }
                    this._initing = false;
                    this._trigger(this.$body, 'inited');
                }
            }
            
            //在某结点之后添加新结点
            , add: function(item, index, position){
                this._add(item, index, false, position);
                this._setStyle();
                this._updateIndex();

            }
            
            //在某结点之前添加新结点
            , insert: function(item, index){
                this._add(item, index, false, 'before');
                this._setStyle();
                this._updateIndex();
            }
            
            
            , addChild: function(item, index, position){
                this._add(item, index, true, position);
                this._setStyle();
                this._updateIndex();
            }
            
            /*
                获得总条数，根据flag的不同，来决定是否返回全部或可见记录
            */
            , rows: function(visible){
                var $body = this.$body;
                var items = [];
                var d;
                var i=0;
                $.each($body.find('tr'), function(){
                    var el = $(this);
                    if ((visible && el.is(":visible") && !el.hasClass('emptyRow')) || !visible){
                        d = $.data(this,'item');
                        items.push(d);
                        i++;
                    }
                });
                return items;
            }
            
            /*
                获得某个索引的行数据，索引可以是tr元素
            */
            , row: function(index){
                var node = this._get_item(index);
                if(node) return node.data('item');
            }
            
            /*
                获得某个元素
                index可以为索引值或tr元素
                如果不存在则返回原index值
            */
            , _get_item: function(index){
                var item;
                var $tbody = this.$tbody;
                
                if($.isNumeric(index)){
                    item = $tbody.find('tr').eq(index)
                    if(item.length == 0)
                        return ;
                    else
                        return item;
                }
                if(!index || index.length==0)
                    return ;
                return $(index);
            }

            /*
                删除行，参数可以为索引数组，同时増加是否删除标志
                如果数据中存在 _canDelete = false 则不允许删除
                index可以为索引或某个tr对象
                cascade表示是否同时删除子结点,如果不同时删除子结点
                则删除之后，其下的子结点将自动移到原结点的父结点上
                
            */
            , remove: function(index, cascade){
                var $tbody = this.$tbody;
                var $head = this.$head;
                var $self = this;
                var nodes = [];
                var node;
                var node_items = [];
                var para = [];
                var item = this._get_item(index);
                var data = this.row(index);
                var indexes = [];
                
                //发出beforeDelete事件
                var e = this._trigger(item, 'delete', data);
                
                //如果被中止，则取消删除
                if (e.isDefaultPrevented()) return false;
                
                if(index == undefined){
                    nodes = $tbody.find('tr');
                }else{
                    if ($.isArray(index)){
                        indexes = index;
                    }else if (index instanceof $)
                        indexes = index;
                    else
                        indexes = [index];

                    for (var i=0, _len=indexes.length; i<_len; i++){
                        node = this._get_item(indexes[i])
                        node_items.push(node);
                        nodes.push(node);
                        if(cascade){
                            var children = this.getChildrenAll(node);
                            Array.prototype.push.apply(nodes, children);
                        }
                    }
                }

                var d, x;
                for(var i=0, _len=nodes.length; i<_len; i++){
                    x = this.row(nodes[i]);
                    d = {}
                    d[this.opts.idField] = x[this.opts.idField]
                    if (this.opts.bindExtraData){
                        this.opts.bindExtraData('remove', d, x, nodes[i]);
                    }

                    para.push(d);
                }
                
                function f(d, is_direct){
                    $tbody.hide();

                    if (!is_direct){
                        for(var i=0, _len=d.length; i<_len; i++){
                            var n = $self.findItem(d[i]);
                            $self._remove(n);
                        }
                    }else{
                        $self._remove(nodes);
                    }
                    
                    //更新所有父结点的样式
                    for(var i=0, _len=node_items.length; i<_len; i++){
                        var parents = $self.getParents(node_items[i]);
                        for(var j=0, j_len=parents.length; j<j_len; j++){
                            $self.updateStyle($(parents[j]));
                        }
                    }
                    //update check all
                    $head.find('th .checkAll').prop('checked','');

                    $self._updateIndex();
                    $self._trigger($self.$body, {type:'deleted'}, data);
                    $self._setStyle();

                    $tbody.show();
                }
                
                this._bind_handler('delete', para, f);
            }
            
            /*
                发送事件，如果处理于初始化状态，则不发出事件

                * 增加对frozen_events的判断
            */
            , _trigger: function(el, type, data){
                var e = $.Event(type);
                if(!this._initing){
                    if (!this.frozen_events || this.frozen_events.indexOf(type)==-1){
                        $(el).trigger(e, data);
                    }
                }
                return e;
            }
            
            /*
                删除某条记录，如果删除成功，则返回 true, 否则返回 false
            */
            , _remove: function(index){
                var $self = this;
                
                if($.isArray(index)){
                    for(var i=index.length-1; i >= 0; i--){
                        this._remove(index[i]);
                    }
                    return ;
                }
                
                var item = this._get_item(index);
                
                if (item){
                    item.remove();
                    this.$count --;
                }
            }
            
            //増加向tr中添加id的处理，因此要保证item有id属性
            //用户可以在options.idField中指定使用哪个key作为id值
            , _rowHtml: function(item){
            
                var opts = this.opts;
                var cls;
                var expandCols = this.$fullColumns;
                var leafCols = this._leafCols();
                var col;
                var index;
                var hasDiv;

                if($.isPlainObject(item)){
                    var trHtml = [];
                    if (item[opts.idField])
                        trHtml.push('<tr '+ opts.keyAttrName + '="' + item[opts.idField] + '"');
                    else
                        trHtml.push('<tr');
                    if($.isFunction(opts.cssRender)){
                        cls = opts.cssRender(item);
                        if (cls[0] == 'add'){
                            trHtml.push(' class="'+cls[1]+'"');
                        }
                    }
                    trHtml.push('>');
                    for(var colIndex=0; colIndex < leafCols.length; colIndex++){
                        hasDiv = false;
                        col = leafCols[colIndex];
                        trHtml.push('<td class="');
                        index =  $.inArray(col, expandCols);
                        trHtml.push(this._genColClass(index));
                        if(opts.nowrap){
                            trHtml.push(' nowrap');
                        }
                        trHtml.push('">')

                        //如果是tree结点列，则每行预留一定的空白
                        if(colIndex == this._getColumnIndex(opts.treeColumn)){
                            hasDiv = true;
                            trHtml.push('<div class="mmg-cellText ');
                            if(opts.nowrap){
                                trHtml.push('nowrap');
                            }
                            trHtml.push('"');
                            var rowIndent = opts.showIcon ? opts.indent + opts.iconIndent+6 : opts.indent
                            trHtml.push(' style="padding-left:' + rowIndent + 'px"');
                            trHtml.push('>');
                        }
                        if(col.renderer){
                            trHtml.push(col.renderer(item[this._getColName(col)],item));
                        }else{
                            trHtml.push(item[this._getColName(col)]);
                        }
                        if (hasDiv)
                            trHtml.push('</div>');
                        trHtml.push('</td>');
                    };
                    trHtml.push('</tr>');
                    return trHtml.join('');
                }
            }
            
            /*
                绑定处理，如果定义了处理函数，则调用函数，如果为字符串
                则认为是URL，调用URL进行处理
                如果是初始化过程，则直接返回不作处理
            */
            , _bind_handler: function(action, data, callback){
                var $self = this;
                var item;
                var para;
                if(this._initing) return;
                if (this.opts.bind){
                    if($.isFunction(this.opts.bindHandler)){
                        this.opts.bindHandler(action, data, callback);
                        return ;
                    }else if(typeof(this.opts.bindHandler) == 'string'){
                        para = {};
                        para.action = action;
                        para.data = JSON.stringify(data)
                        $.ajaxQueue({
                            url:this.opts.bindHandler,
                            type:'POST',
                            dataType:'json',
                            data:para
                        })
                        .done(function(r){
                            if(r.success){
                                if(r.update_data){
                                    for(var i=0; i<r.update_data.length; i++){
                                        item = $self.findItem(r.update_data[i][$self.opts.idField]);
                                        $self._update(r.update_data[i], item);
                                    }
                                }
                                if($.isFunction(callback))
                                    callback(r.data);
                                if($self.opts.showMessage && r.message){
                                    $self.opts.showMessage(r.message);
                                }
                            }
                            else{
                                if(r.message){
                                    if($self.opts.showMessage) $self.opts.showMessage(r.message, 'error');
                                    else alert('Response failed: '+r.message);
                                }
                            }
                        })
                        .fail(function(jqXHR, textStatus){
                            if($self.opts.showMessage) $self.opts.showMessage('Response failed: '+textStatus, 'error');
                            else alert('Response failed: '+textStatus);
                        });
                        return ;
                    }
                }
                 
                if($.isFunction(callback))
                    callback(undefined, 'direct');
            }
            
            , saveOrdering: function (callback){
                var para = [];
                var nodes = this.$body.find('tbody tr');
                var d;
                var data;
                var ordering = 0;
                for(var i=0; i<nodes.length; i++){
                    d = {};
                    data = this.row($(nodes[i]));
                    if (data[this.opts.orderingField] <= ordering){
                        ordering ++;
                        d[this.opts.idField] = data[this.opts.idField];
                        d[this.opts.orderingField] = ordering;
                        if (this.opts.bindExtraData){
                            this.opts.bindExtraData('save_ordering', d, data, nodes[i]);
                        }
                        data[this.opts.orderingField] = ordering;
                        para.push(d);
                    }else{
                        ordering = data[this.opts.orderingField];
                    }
                }
                this._bind_handler('saveOrdering', para, callback);
            }
            /*
                将后台返回的数据合并到数据中，格式为 [{id: k1:, k2}]
            */
            , mergeData: function (data){
                if (!data) return;
                
                var item;
                for(var i=0; i<data.length; i++){
                    item = this.findItem(data[i][this.opts.idField]);
                    this._update(data[i], item);
                }
            }
            
            , collapse: function (node){
                var data = this.row(node);
                e = this._trigger(node, 'collapse', data);
                if(e.isDefaultPrevented()) return;
                this.frozen(true, ['collapse', 'collapsed']);
                this._collapse($(node), true);
                this.frozen(false);
                this._trigger(node, 'collapsed', data);
            }
            
            , collapseById: function(nodeId){
                var node = this.findItem(nodeId);
                return this.collapse(node);
            }
            
            , collapseAll: function (parent){
                if(!parent || parent.length==0){
                    var children = this.getChildren(parent);
                    var node;
                    e = this._trigger(this.$body, 'collapseAll');
                    if(e.isDefaultPrevented()) return;
                    this.frozen(true, ['collapse', 'collapsed']);
                    for (var i=0; i<children.length; i++){
                        node = $(children[i]);
                        this._collapse(node);
                    }
                    this.frozen(false);
                    this._trigger(this.$body, 'collapsedAll');
                }else{
                    this.collapse(parent);
                }

            }
            
            , expandAll: function (parent){
                var that = this;
                var nodes;
                if(!parent || parent.length==0){
                    nodes = this.getChildren();
                }else{
                    nodes = [parent];
                }
                e = this._trigger(this.$body, 'expandAll');
                if(e.isDefaultPrevented()) return;
                this.frozen(true, ['expand', 'expanded']);
                this._expandAll(nodes);
                this.frozen(false);
                this._trigger(this.$body, 'expandedAll');
            }

            , _expandAll: function(parents){
                var that = this;
                for (var i=0; i<parents.length; i++){
                    var parent = parents[i];
                    that._expand($(parent), function(flag, parent){
                        var children = that.getChildren(parent);
                        that._expandAll(children);
                    });
                }
            }
            
            /*
                收起一个树结点
            */
            , _collapse: function (node, first) {
                if(!node || node.length == 0)
                    return ;

                if(!node.hasClass('parent')) 
                    return ;
                
                $self = this;
                var data = this.row(node);
                
                if(node.hasClass('parent') && node.hasClass('expanded')){
                    if(first)
                        node.removeClass("expanded").addClass("collapsed");
                    else
                        node.addClass("collapsed");
                        
                    if(this.opts.showIcon) {
                        var icon = node.find('span.tree-icon');
                        icon.removeClass('tree-folder-open').addClass('tree-folder');
                    }
                
                    e = this._trigger(node, 'collapse', data);
                    if(e.isDefaultPrevented()) return;
                    
                    this.getChildren(node).each(function() {
                        if(!$(this).hasClass("collapsed")) {
                            $self._collapse($(this));
                        }
                
                        $(this).addClass('ui-helper-hidden');
                
                    });
                    
                    this._trigger(node, 'collapsed', data);
                    
                }
                return node;
            }

            , expand: function(node, callback) {
                var data = this.row(node);

                e = this._trigger(node, 'expand', data);
                if(e.isDefaultPrevented()) return;

                this.frozen(true, ['expand', 'expanded']);
                this._expand(node, callback);
                this.frozen(false);
                this._trigger(node, 'expanded', data);
            }
            /*
                展开一个树结点
                callback 用于异步调用时的回调 (是否异步调用， 当前结点，是否展开)
            */
            , _expand: function (node, callback) {
                if(!node || node.length == 0)
                    return ;
                    
                if(!node.hasClass('parent')) {
                    if (callback)
                        callback(false, node, false);
                    return ;
                }
                    
                var $self = this;
                var data = this.row(node);
                var children = this.getChildren(node);
                
                if (node.hasClass('collapsed')){
                    node.removeClass("collapsed").addClass("expanded");
                    if(this.opts.showIcon) {
                        var icon = node.find('span.tree-icon');
                        icon.removeClass('tree-folder').addClass('tree-folder-open');
                    }
                
                    if(children.length > 0){
                        children.each(function() {
                            if($(this).is(".parent.expanded")) {
                                $self._expand($(this), callback);
                            }
                    
                            $(this).removeClass('ui-helper-hidden');
                    
                        });

                        if (callback)
                            callback(false, node, true);

                    }

                    //如果没有子结点，则判断是否装过数据，data('loaded')
                    //如果装过数据，则忽略
                    else{
                        if(!node.data('loaded')){
                            this.doExpand('expand', node, data, callback);
                            node.data('loaded', true);
                        }else{
                            this._trigger(node, 'expanded', data);
                        }
                    }
                    
                }else{
                    if (callback)
                        callback(false, node, false);

                }
            
              return node;
            }
            
            , expandById: function(nodeId) {
                var node = this.findItem(nodeId);
                return this.expand(node);
            }
            
            , doExpand: function (action, node, data, callback) {
                if(this.opts.expandURL) {
                    var $self = this;
                    var para = {};
                    if (typeof this.opts.expandParam === 'string'){
                        para[this.opts.expandParam] = data[this.opts.expandParam];
                    }else if($.isPlainObject(this.opts.expandParam)){
                        $.each(this.opts.expandParam, function(k, v){
                            para[k] = data[v];
                        });
                    }
                    var args = {};
                    if($.isFunction(this.opts.expandArgs))
                        args = this.opts.expandArgs();
                    
                    $.ajaxQueue({
                        url: this.opts.expandURL,
                        type: this.opts.expandMethod || 'GET',
                        dataType:'json',
                        data:$.extend(true, para, args)
                    })
                    .done(function(r){
                        if($.isArray(r) || !r.success) {
                            r = {success: true, data: r}
                        }
                        
                        if(r.success){
                            if(r.data){
                                var parentId = node[$self.opts.idField];
                                var parent = $self.findItem(parentId);
                                var d = r.data;
                                $self.EventExpand = true;
                                if($.isFunction($self.opts.expandFilter)) {
                                    d = $self.opts.expandFilter(r.data, parentId);
                                    $self.addChild(d, parent)
                                } else {
                                    $self.addChild(r.data, parent)
                                }
                                $self.EventExpand = false;
                                if (callback)
                                    callback(true, node, true);
                                $self._trigger(node, 'expanded', d);
                                
                            }
                            if($self.opts.showMessage && r.message){
                                $self.opts.showMessage(r.message);
                            }
                        }
                        else{
                            if(r.message){
                                if($self.opts.showMessage) $self.opts.showMessage(r.message, 'error');
                                else alert('Response failed: '+r.message);
                            }
                        }
                    })
                    .fail(function(jqXHR, textStatus){
                        if($self.opts.showMessage) $self.opts.showMessage('Response failed: '+textStatus, 'error');
                        else alert('Response failed: '+textStatus);
                    });
                    
                } else {
                    
                }
            }
            
            , selectedRowsIds: function(){
                var $body = this.$body;
                var $trs = this.$body.find('tr')
                var that = this;
                var selected = [];

                $.each($body.find('tr.selected'), function(index, v){
                    selected.push($(v).attr(that.opts.keyAttrName));
                });
                return selected;
            }

            , selectedItem: function(){
                var $body = this.$body;
                return $body.find('tr.selected:first');
            }
            
            , selectedItems: function(){
                var $body = this.$body;
                var selected = [];
                return $body.find('tr.selected');
            }
            
            /*
                切換折叠和展示状态
            */
            , toggleExpand: function (node) {
                if(node.hasClass("collapsed")) {
                    this.expand(node);
                } else {
                    this.collapse(node);
                }

                if (this.opts.persist) {
                    // Store cookie if this node is expanded, otherwise delete cookie.
                    var cookieName = this.opts.persistCookiePrefix + node.attr(this.opts.keyAttrName);
                    $.cookie(cookieName, node.hasClass('expanded') ? 'true' : null, this.opts.persistCookieOptions);
                }

                return this;
            }
            
            /*
                获得当前结点对应的父结点的值，此值的属性名可以根据 parentAttrName
                来修改
            */
            , _getParentValue: function (node){
                return $(node).attr(this.opts.parentAttrName);
            }
            
            /*
                设置当前结点对应的父结点的值
            */
            , _setParentValue: function (node, value){
                var parent;
                var data = this.row(node);
                var p_data;
                
                if (value){
                    $(node).attr(this.opts.parentAttrName, value);
                    data[this.opts.parentField] = value;
                    parent = this.findItem(value);
                    //是否装载要根据有没有执行expand方法来处理
                    //但如果isParent为false, 则自动视为loaded
                    if (parent){
                        p_data = this.row(parent);
                        if (!p_data.isParent)
                            parent.data('loaded', true);
                    }
                }
                else{
                    $(node).removeAttr(this.opts.parentAttrName);
                    data[this.opts.parentField] = '';                    
                }
            }
            
            , _getPaddingLeft: function (node) {
                var paddingLeft = parseInt(node[0].style.paddingLeft, 10);
                return ((isNaN(paddingLeft)) ? this.opts.defaultPaddingLeft : paddingLeft);
            }
            
            /*
                获得对应的列索引。如果index为字段名则查找对应的索引值
            */
            , _getColumnIndex: function (index) {
                if (!$.isNumeric(index)){
                    for(var i=0, _len=this.$columns.length; i<_len; i++){
                        if(this._getColName(this.$columns[i]) == index) return i;
                    }
                    return ;
                }else
                    return index;
            }
            
            /*
                获得某个结点的key值
            */
            , getKey: function(node) {
                return $(node).attr(this.opts.keyAttrName);
            }

            , hasChildren: function(node){
                if(node && node.length>0){
                    var next = $(node).next();
                    return next.attr(this.opts.parentAttrName) == this.getKey(node);
                }
                else{
                    return ;
                }
            }
            /*
                获得某个结点的子结点,如果node为undefined则返回所有顶层
                的结点
            */
            , getChildren: function(node){
                if(node && node.length>0)
                    return $(node).siblings("tr[" + this.opts.parentAttrName + '="' + this.getKey(node) + '"]');
                else{
                    return this.$body.find('tbody tr:not(['+this.opts.parentAttrName+'])');
                }
            }
            /*
                获得某个结点的所有子结点，包括子结点的子结点
            */
            , getChildrenAll: function(node, include_self){
                var nodes = [];
                
                if (!node || node.length==0) return nodes;
                
                if (include_self) nodes.push(node);
                
                var cur;
                var level = node.attr('level');
                
                //如果是同层，则取相同的parent和level的下一个结点
                cur = $(node).next();
                while (cur.length>0){
                    if (cur.attr('level') <= level){
                        break;
                    }
                    nodes.push(cur);
                    cur = $(cur).next();
                }
                return nodes;
            }

            /*
                获得当前结点的所有父结点
            */
            , getParents: function (node) {
                var parents = [];
                while(node = this.getParent(node)) {
                    if (node.size() > 0)
                        parents[parents.length] = node[0];
                }
                return parents;
            }

            /*
                获得当前结点的直接父结点
            */
            , getParent: function (node) {
                if (!node || node.length==0) return ;
                
                var parent = this._getParentValue(node);
                if (parent)
                    return $('#' + parent);
            
                return ;
            }
            
            /*
                获得当前结点的下一个同级或高级结点,如果不存在则返回undefined
                如果samelevel=true，则只找同一个父结点的下一个同级结点
                如果为false，则返回其它树的第一个结点
            */
            , getNext: function(node, samelevel){
                if (!node || node.length==0) return ;
                
                var cur;
                var level = parseInt(node.attr('level'));
                var x;
                
                //如果是同层，则取相同的parent和level的下一个结点
                cur = $(node).next();
                while (cur.length>0){
                    x = parseInt(cur.attr('level'));
                    if(level == x){
                        return cur;
                    }else if (x < level){
                        if(samelevel) return;
                        return cur;
                    }else{
                        cur = $(cur).next();
                    }
                }
            }
            
            /*
                获得node同级的所有后续的结点
            */
            , getNextAll: function(node){
                if (!node || node.length==0) return ;
                
                var cur;
                var level = node.attr('level');
                var nodes = [];
                
                //如果是同层，则取相同的parent和level的下一个结点
                cur = $(node).next();
                while (cur.length>0){
                    if(level == cur.attr('level')){
                        nodes.push(cur);
                    }else if (cur.attr('level') < level){
                        break;
                    }
                    
                    cur = $(cur).next();
                }
                return nodes;
            }
            
            /*
                获得当前结点的上一个同级结点,如果不存在则返回undefined
            */
            , getPrev: function (node){
                if (!node || node.length==0) return ;
                
                var cur;
                var level = node.attr('level');
                
                //如果是同层，则取相同的parent和level的下一个结点
                cur = $(node).prev();
                while (cur.length>0){
                    if(level == cur.attr('level')){
                        return cur;
                    }else if (cur.attr('level') < level){
                        return ;
                    }
                    
                    cur = $(cur).prev();
                }
            }
            
            , select: function(args, isId, forceSingle){
                var opts = this.opts;
                var $body = this.$body;
                var $head = this.$head;
                var find;
                var that = this;
                var is_selected;
                var el;
                var select_all = false;
                var check_all = true;
                
                e = this._trigger($body, 'select');
                if(e.isDefaultPrevented()) return;

                $.each($body.find('tr'), function(index){
                    el = $(this);
                    if (typeof args === 'number' && !isId){
                        find = index === args;
                    }else if (typeof args === 'function'){
                        find = args($.data(el, 'item'), index, isId);
                    }else if (args === undefined || (typeof args === 'string' && args === 'all')){
                        find = true;
                        select_all = true;
                    }else if ($.isArray(args)){
                        if (isId)
                            find = args.indexOf(el.attr(that.opts.keyAttrName)) != -1;
                        else
                            find = args.indexOf(index) != -1;
                    }else if (args instanceof jQuery && $(args).is(el)){
                        find = true;
                    }
                    else{
                        find = el.attr(that.opts.keyAttrName) === args;
                    }
                    is_selected = el.hasClass('selected');
                    if (find){
                        if (select_all) el.addClass('selected');
                        else{
                            if (is_selected) el.removeClass('selected');
                            else el.addClass('selected');
                        }
                    }else{
                        if(!opts.multiSelect || forceSingle){
                            if (is_selected)
                                el.removeClass('selected');
                        }
                    }
                    if(opts.checkCol){
                        if (el.hasClass('selected')){
                            el.find('td .mmg-check').prop('checked','checked');
                        }else{
                            el.find('td .mmg-check').prop('checked','');
                            check_all = false;
                        }
                    }
                });
                if (opts.checkCol){
                    if (check_all){
                        $head.find('th .checkAll').prop('checked','checked');
                    }else{
                        $head.find('th .checkAll').prop('checked','');
                    }
                }
                
                this._trigger($body, 'selected');
                
            }
                //取消选中
            , deselect: function(args, isId){
                var opts = this.opts;
                var $body = this.$body;
                var $head = this.$head;
                var $tr;
                
                e = this._trigger($body, 'deselect');
                if(e.isDefaultPrevented()) return;
                
                if(typeof args === 'number' && !isId){
                    $tr = $body.find('tr').eq(args);
                    $tr.removeClass('selected');
                    if(opts.checkCol){
                        $tr.find('td .mmg-check').prop('checked','');
                    }
                }else if(typeof args === 'function'){
                    $.each($body.find('tr'), function(index){
                        if(args($.data(this, 'item'), index, isId)){
                            $(this).removeClass('selected');
                            if(opts.checkCol){
                                $(this).find('td .mmg-check').prop('checked','');
                            }
                        }
                    });
                }else if(args === undefined || (typeof args === 'string' && args === 'all')){
                    $body.find('tr.selected').removeClass('selected');
                    if(opts.checkCol){
                        $body.find('tr > td').find('.mmg-check').prop('checked','');
                    }
                }else if (args instanceof jQuery){
                    $tr = $(args);
                    $tr.removeClass('selected');
                    if(opts.checkCol){
                        $tr.find('td .mmg-check').prop('checked','');
                    }
                }else{
                    if (isId){
                        $tr = this.findItem(args);
                        $tr.removeClass('selected');
                        if(opts.checkCol){
                            $tr.find('td .mmg-check').prop('checked','');
                        }
                    }
                }
                
                $head.find('th .checkAll').prop('checked','');
                
                this._trigger($body, 'deselected');
                
            }
            
//            , move: function (node, destination) {
//                var $self = this;
//                
//                node.insertAfter(destination);
//                this.getChildren(node).reverse().each(function() { 
//                    $self.move($(this), node[0]); 
//                });
//            }
            
            /*
                更新某条记录，只更新对应的字段
                 exact 用来控制是否只更新对应的列
            */
            , _update: function(item, index, exact){
                var opts = this.opts;
                var $tbody = this.$tbody;
                if(!$.isPlainObject(item)){
                    return ;
                }
                
                var that = this;
                var $tr = this._get_item(index);
                var checked = $tr.find('td:first :checkbox').is(':checked');
                var text;
                var cell;
                var data = this.row($tr);
                var col;
                var cell_text;
                $.extend(data, item);
                
                if (exact) data = item;
                $.each(data, function(key, value){
                    for(var colIndex=0, _len=that.$columns.length; colIndex < _len; colIndex++){
                        col = that.$columns[colIndex];
                        if(that._getColName(col) == key){
                            if(col.renderer){
                                text = col.renderer(data[that._getColName(col)], data);
                            }else{
                                text = value;
                            }
                            cell = $tr.find('td').eq(colIndex);
                            cell_text = cell.find(opts.fieldTarget);
                            if (cell_text.length>0)
                                cell_text.html(text);
                            else
                                cell.html(text);
                            break;
                        }
                    }
                });
                
                //更新样式
                if($.isFunction(opts.cssRender)){
                    cls = opts.cssRender(data);
                    if (cls[0] == 'add'){
                        if(!$tr.hasClass(cls[1])) $tr.addClass(cls[1]);
                    }else if(cls[0] == 'remove') $tr.removeClass(cls[1]);
                }
                
                if(opts.checkCol){
                    $tr.find('td:first :checkbox').prop('checked',checked);
                }
            
                this._setStyle();
                return data;
            }

            , update: function(item, index, exact){
                var data = this._update(item, index, exact);
                var $tr = this._get_item(index);
                if (data)
                    this._trigger($tr, 'updated', data);
            }
            
            /*
                向上移动
            */
            , up: function (node, target) {
                var n = target || this.getPrev(node);
                var data = this.row(node);
                var children = this.getChildrenAll(node, true);
                var para = [];
                var i;
                var $self = this;

                if(n){
                    e = this._trigger(node, 'up', data);
                    if(e.isDefaultPrevented()) return;
                
                    var d = {}
                    var d_row = this.row(n);
                    d[this.opts.idField] = this.getKey(node);
                    d[this.opts.orderingField] = d_row[this.opts.orderingField];
                    if (this.opts.bindExtraData){
                        this.opts.bindExtraData('up', d, data, node);
                    }
                    para.push(d);

                    d = {}
                    d[this.opts.idField] = this.getKey(n);
                    d[this.opts.orderingField] = data[this.opts.orderingField];
                    //绑定的数据是按两个结点交换来处理的
                    if (this.opts.bindExtraData){
                        this.opts.bindExtraData('up', d, d_row, n);
                    }
                    para.push(d);

                    function f(){
                        for(i=0; i<children.length; i++){
                            n.before(children[i]);
                        }
                        $self._trigger(node, 'upped', data);
                    }
                    
                    this._bind_handler('update', para, f);
                }
                
            }
            
            , down: function (node) {
                var n = this.getNext(node, true);

                if(n){
                    this.up(n, node);
                }
                
            }
            /*
                使当前结点向后缩近，变成上一结点的子结点
            */
            , indent: function (node, value) {
                var $self = this;
                var prev;
                var data = this.row(node);
                var para = [];
                
                //取同级上一个结点
                prev = this.getPrev(node);
                if (prev){
                
                    e = this._trigger(node, 'indent', data);
                    if(e.isDefaultPrevented()) return;
                    
                    //获得第一个结点的数据，及它的子结点的数据
                    //第一个结点为新的level及父结点
                    //子结点只需要新的level
                    var d = {};
                    d[this.opts.idField] = data[this.opts.idField];
                    d['level'] = this._level(node)+1;
                    d[this.opts.parentField] = this.getKey(prev);
                    
                    //取父结点的最后一个子结点，得到它的ordering值
                    var c = this.getChildren(prev);
                    if(c.length>0){
                        var ordering = this.row(c[c.length-1])[this.opts.orderingField];
                        if (data[this.opts.orderingField] <= ordering){
                            d[this.opts.orderingField] = ordering + 1;
                            data[this.opts.orderingField] = d[this.opts.orderingField];
                        }
                    }
                    if (this.opts.bindExtraData){
                        this.opts.bindExtraData('indent', d, data, node);
                    }
                    //如果无子结点，ordering值可以不变
                    para.push(d);
                    
                    var children = this.getChildrenAll(node);
                    var x;
                    for(var i=0; i<children.length; i++){
                        x = this.row(children[i]);
                        d = {};
                        d[this.opts.idField] = x[this.opts.idField];
                        d['level'] = this._level(children[i])+1;
                        if (this.opts.bindExtraData){
                            this.opts.bindExtraData('indent', d, x, children[i]);
                        }
                        para.push(d);
                    }
                    
                    function f(){
                        //将当前结点变为同级上一个结点的子结点
                        $self._setParentValue(node, $self.getKey(prev));
                        $self._indent(node, 1);
                        $self._indent(children, 1);

                        $self.updateStyle(prev);

                        $self._trigger(node, 'indented', data);
                    }
                    
                    d = {data:para, node_id:data[this.opts.idField]}
                    this._bind_handler('indent', d, f);
                    

                }
            }
            
            /*
                使当前结点向前缩近，变成当前结点父结点的子结点
            */
            , unindent: function (node, value) {
                var $self = this;
                var parent;
                var grandpar;
                var data = this.row(node);
                var next;
                var para = [];
                var d, i, x, ordering;
                
                parent = this.getParent(node);
                if (parent){
                
                    next = this.getNext(node, true);
                    
                    e = this._trigger(node, 'unindent', data);
                    if(e.isDefaultPrevented()) return;

                    grandpar = this.getParent(parent);
                    
                    d = {};
                    d[this.opts.idField] = data[this.opts.idField];
                    if(grandpar){
                        //将当前结点变为祖父结点的子结点
                        d[this.opts.parentField] = this.getKey(grandpar);
                    }
                    else{
                        //已经到顶层，则清除父结点信息
                        d[this.opts.parentField] = '';
                    }
                    d['level'] = Math.max(0, this._level(node)-1);
                    ordering = this.row(parent)[this.opts.orderingField];
                    if (data[this.opts.orderingField] <= ordering){
                        ordering ++;
                        d[this.opts.orderingField] = ordering;
                        data[this.opts.orderingField] = ordering;
                    }else
                        ordering = data[this.opts.orderingField];
                    if (this.opts.bindExtraData){
                        this.opts.bindExtraData('unindent', d, data, node);
                    }
                    para.push(d);
                    
                    //将当前结点下的同级结点的ordering按node的ordering向后移动
                    var nexts = this.getNextAll(parent);
                    for(i=0; i<nexts.length; i++){
                        d = {};
                        x = this.row(nexts[i]);
                        d[this.opts.idField] = x[this.opts.idField];
                        if (x[this.opts.orderingField] > ordering){
                            ordering = x[this.opts.orderingField];
                        }else{
                            ordering ++;
                            x[this.opts.orderingField] = ordering;
                            d[this.opts.orderingField] = ordering;
                            if (this.opts.bindExtraData){
                                this.opts.bindExtraData('unindent', d, x, nexts[i]);
                            }
                            para.push(d);
                        }
                    }
                    
                    var children = this.getChildrenAll(node);
                    for(i=0; i<children.length; i++){
                        x = this.row(children[i]);
                        d = {};
                        d[this.opts.idField] = x[this.opts.idField];
                        d['level'] = Math.max(0, this._level(children[i])-1);
                        if (this.opts.bindExtraData){
                            this.opts.bindExtraData('unindent', d, x, children[i]);
                        }
                        para.push(d);
                    }
                    var nextNode = next;
                    var y;
                    while(nextNode){
                        d = {}
                        y = this.row(nextNode);
                        d[this.opts.idField] = y[this.opts.idField];
                        d[this.opts.parentField] = this.getKey(node);
                        if (this.opts.bindExtraData){
                            this.opts.bindExtraData('unindent', d, y, nextNode);
                        }
                        para.push(d);
                        nextNode = this.getNext(nextNode, true);
                    }
                    
                    function f(){
                        if(grandpar){
                            //将当前结点变为祖父结点的子结点
                            $self._setParentValue(node, grandpar.attr($self.opts.keyAttrName));
                        }
                        else{
                            //已经到顶层，则清除父结点信息
                            $self._setParentValue(node);
                        }

                        $self._indent(node, -1);
                        $self._indent(children, -1);
                        
                        //下一个同级结点应该是当前结点的子结点
                        var nextNode = next;
                        while (nextNode){
                            $self._setParentValue(nextNode, node.attr($self.opts.keyAttrName));
                            nextNode = $self.getNext(nextNode, true);
                        }
                        
                        $self.updateStyle(parent);
                        $self.updateStyle(node);
                        
                        $self._trigger(node, 'unindented', data);
                    }
                    
                    d = {data:para, node_id:data[this.opts.idField], 
                        old_parent_id: this.getKey(parent)}
                    this._bind_handler('unindent', d, f);
                    
                }
            }
            
            , updateStyle: function(node, expandable, force){
                var old_expand = expandable;
                var opts = this.opts;
                var $self = this;
                var has_children = this.hasChildren(node);
//                var parent = this.getParent(node);
                //记录旧的_isParent值，用来比较新值，以便可以发出updated事件
                var add_cls = '', rm_cls = '';
                var has_init = node.hasClass('initialized');
                var has_parent = node.hasClass('parent');
                var has_expanded = node.hasClass('expanded');
                var has_collapsed = node.hasClass('collapsed');
                var new_parent;

                if (expandable || expandable === undefined)
                    expand = 'expanded';
                else
                    expand = 'collapsed';

                if(!has_init || force ||
                    (has_parent && !has_children) ||
                    (!has_parent && has_children) ||
                    (has_expanded && expand=='collapsed') ||
                    (has_collapsed && expand=='expanded')){

                    var cell = node.find("td").eq(this.$treeColumnIndex);
                    var target = cell.find('div.mmg-cellText');
                    var a = cell.find('a.expander');
                    var padding = opts.indent*(this._level(node)+1);
                    var data = this.row(node);
                    var old_is_parent = data._isParent;


                    function _process_class(){

                        if(!has_init)
                            add_cls += ' initialized';

                        if(expandable && !has_expanded){
                            rm_cls += ' collapsed';
                            add_cls += ' expanded';
                        }
                        if((expandable === false) && !has_collapsed && has_children){
                            rm_cls += ' expanded';
                            add_cls += ' collapsed';
                        }

                        //如果当前结点的数据中有_isParent或子结点数>0，则添加parent信息
                        if((data._isParent && !node.data('loaded') && !has_children) || has_children) {
                            data._isParent = true;
                            add_cls += ' parent';

                            new_parent = true;
                        }else{
                            data._isParent = false;
                            rm_cls += ' parent';
                            a.remove();

                            new_parent = false;
                        }
                    }

                    function _process_icon(){
                        if(opts.showIcon) {
                            var icon = cell.find('span.tree-icon');
                            if(icon.length==0) {
                                icon = $('<span class="tree-icon"></span>');
                                cell.children('div').prepend(icon);
                            }
                            target.css('paddingLeft', padding + opts.iconIndent+6);
                            icon.css('left', padding-16 + opts.iconIndent);
                            icon.removeClass('tree-file').removeClass('tree-folder').removeClass('tree-folder-open');
                            if (new_parent) {
                                if(has_expanded){
                                    icon.addClass('tree-folder-open');
                                } else {
                                    icon.addClass('tree-folder');
                                }
                            } else {
                                icon.addClass('tree-file')
                            }
                            if(data.iconCls) {
                                icon.addClass(data.iconCls);
                            }
                        } else {
                            target.css('paddingLeft', padding);
                        }
                    }

                    function _process_parent(){
                        if(new_parent){
                            if(opts.expandable) {
                                if (a.length==0){
                                    a = $('<a href="#" title="' + opts.stringExpand + '" class="expander"></a>');
                                    a.click(function(e) {
                                        e.preventDefault();
                                        $self.toggleExpand(node);
                                        return false;
                                    });
                                    if(opts.clickableNodeNames) {
                                        a.css('cursor', "pointer");
                                        $(cell).click(function(e) {
                                            e.preventDefault();
                                            // Don't double-toggle if the click is on the existing expander icon
                                            if (e.target.className != 'expander') {
                                                $self.toggleExpand(node);
                                            }
                                        });
                                    }
                                    cell.children('div').prepend(a);

                                }
                            }

                            if(!(has_expanded || has_collapsed)) {
                                add_cls += ' ' + expand;
                            }

                        }

                        node.removeClass(rm_cls).addClass(add_cls);
                        a.css('left', padding-16);
                    }

                    _process_class();
                    _process_icon();
                    _process_parent();
                    if (old_is_parent !== data._isParent)
                        $self._trigger(node, 'updated', data);

                }
            }
            /*
                在指定的行对应的列显示一个小图标
            */
            , set_notation: function(index, column, cls, message){
                var $tr = this._get_item(index);
                var cell = $($tr.children("td")[this._getColumnIndex(column)]);
                cell.removeClass('error').removeClass('warning').removeClass('success').remove('info').remove('changed');
                cell.addClass(cls);
                cell.attr('title', message);
                cell.find('.mmg-notation').remove();
                var item = $('<span class="mmg-notation '+cls+'" title="'+message+'"></span>');
                var wrapper = cell.find('div.mmg-cellWrapper');
                if (wrapper.length==0){
                    cell.html('<div class="mmg-cellWrapper">' + cell.html() + '</div>');
                    wrapper = cell.find('div.mmg-cellWrapper');
                }
                wrapper.append(item);
            }
            
            /*
                使当前结，包括子结点向后缩近
            */
            , _indent: function (node, direction){
                if (!node || node.length==0) return ;
                if ($.isArray(node) && node.length>0){
                    for(var i=0; i<node.length; i++){
                        this._indent(node[i], direction);
                    }
                    return ;
                }
                node = $(node);
                var $self = this;
                if(direction>0){
                    $(node).attr('level', this._level(node)+1);
                }
                else{
                    $(node).attr('level', Math.max(0, this._level(node)-1));
                }
                
                this.updateStyle(node, undefined, true);
            }
            
            /*
             * 单元格编辑器更新后的处理
             */
            , onEditorCallback: function(row, col, value){
//                var data = $.data(row, 'item');
//                data[col.name] = value;
                var d = {};
                d[col.name] = value.data;
                this.update(d, row, true);
                if (value.update_data){
                    this.mergeData(value.update_data);
                }
            }

            /*
             * 处理checkbox被点击的事件，在tree中，如果同时按下了shift，则自动选中子结点
             * 如果启用alt模式，则只有在按下alt时，才是执行多选，否则为单选
             */
            , _on_click_checkbox: function(){
                var $body = this.$body;
                var that = this;
                var node;
                var children;
                var checked;

                $body.on('click','tr > td .mmg-check',function(e){
                    var forceSingle=true;
                    e.stopPropagation();
                    node = $($(this).parents('tr')[0]);
                    if (e.altKey && that.opts.multiSelect){
                        children = that.getChildrenAll(node, true);
                        forceSingle = false;
                    }else if (that.opts.multiSelect){
                        children = [node];
                        forceSingle = false;
                        if (that.opts.multiSelectKey){
                            forceSingle = true;
                            if (that.opts.multiSelectKey == 'alt' && e.altKey)
                                forceSingle = false;
                            else if (that.opts.multiSelectKey == 'shift' && e.shiftKey)
                                forceSingle = false;
                            else if (that.opts.multiSelectKey == 'ctrl' && e.ctrlKey)
                                forceSingle = false;
                        }
                    }
                    checked = this.checked;
                    for(var i=0, _len=children.length; i<_len; i++){
                        if(checked){
                            that.select(children[i], false, forceSingle);
                        }else{
                            that.deselect(children[i]);
                        }

                    }
                });
            }

            , onSelect: function(el){
                var forceSingle = true;
                if(this.opts.multiSelect)
                    if (this.opts.multiSelectKey)
                        forceSingle = true;
                    else
                        foceSingle = false;
                if(!el.parent().hasClass('selected')){
                    this.select(el.parent().index(), null, forceSingle);
                }else{
                    this.deselect(el.parent().index(), null, forceSingle);
                }
            }


            /*
             * frozen 冻结事件
             * flag = true 表示冻结事件， false 表示发出事件
             * events 事件名称，是一个数组，可以忽略多个事件
             */
            , frozen: function(flag, events){
                if (flag)
                    this.frozen_events = events;
                else
                    this.frozen_events = [];
            }
            
        } // end of methods
        
        
    } //end of treegrid

    //调用mmGrid插件初始化处理
    $.fn.mmGrid.addPlugin(treegrid);
    
})(jQuery);

