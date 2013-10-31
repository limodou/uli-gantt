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
            fieldTarget: 'div.mmg-cellWrapper div', //每个单元格的第一个子元素标签名，在生成每个单元格时要与此一致
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
            readonly: true,  //如果是只读，则不能进行add, remove, indent, unindent等编辑操作
            orderingField: 'ordering',   //ordering用来保持每条的顺序号
            showMessage: null,   //显示消息的函数,
            cssRender:null,      //返回tr对应的css回调函数
            
            showIcon: false,    //树列显示图标
            iconIndent: 16,     //图标的宽度
            expandMethod: 'GET',//自动展开子结点ajax请求方式
            expandParam: 'id',  //自动展开子结点ajax请求参数名
            expandFilter: null, //自动展开数据预处理
            expandURL: null     //自动展开子结点URL 
            
            
        },
        
        _init: function(){
            var $self = this;
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
                var $tbody = this.$body.find('tbody');
                var nodes = [];
                var pos;
                
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
                    $tbody.append($tr);
                    this._trigger($tr, 'added', item);
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
                        
                        this._updateIndex();
                        this._trigger($tr, 'added', item);
                        
                    }
                }
                
                //如果有父结点，则处理父结点的样式
                if (parent){
                    e = this._trigger(this.$body, 'add', item);
                    if(e.isDefaultPrevented()) return;
                    
                    //如果position为last，则插入到子结点的最后
                    if(position == 'last'){
                        var children = this.getChildren(parent);
                        if(children.length > 0){
                            next = this.getNext($(children[children.length-1]));
                            if (next){
                                next.before($tr);
                            }
                            else
                                $tbody.append($tr);
                        }
                        else parent.after($($tr));
                    }
                    else
                        parent.after($($tr));
                    
                    this._updateIndex();
                    this._trigger($tr, 'added', item);
                    
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
                
                this._updateIndex();
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
                查找当前元素的上一个兄弟结点
            */
            
            , _populate: function(items, append){
                var opts = this.opts;
                var $body = this.$body;
                this._initing = true;   //初始化标志
                var replace = false;
                var has_body = $body.find('tbody').size() > 0;
                
                if (!has_body || (!append && has_body))
                    replace = true;
                
                this._hideMessage();
                if(items && items.length !== 0 && opts.cols){
                    if (replace)
                        $body.empty().html('<tbody></tbody>');
                    this.add(items, undefined, 'last')
                }else{
                    if (replace){
                        this._insertEmptyRow();
                        this._showNoData();
                    }
                }
                this._setStyle();
                
                if(opts.fullWidthRows && this._loadCount <= 1){
                    this._fullWidthRows();
                }
                
                this._hideLoading();
                this._initing = false;
                this._trigger(this.$body, 'inited');
            }
            
            //在某结点之后添加新结点
            , add: function(item, index, position){
                this._add(item, index, false, position);
                this._setStyle();
            }
            
            //在某结点之前添加新结点
            , insert: function(item, index){
                this._add(item, index, false, 'before');
                this._setStyle();
            }
            
            
            , addChild: function(item, index, position){
                this._add(item, index, true, position);
                this._setStyle();
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
                var $tbody = this.$body.find('tbody');
                
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
                var $tbody = this.$body.find('tbody');
                var $self = this;
                var nodes = [];
                var node;
                var para = [];
                var item = this._get_item(index);
                var data = this.row(index);
                
                //发出beforeDelete事件
                var e = this._trigger(item, 'delete', data);
                
                //如果被中止，则取消删除
                if (e.isDefaultPrevented()) return false;
                
                if(index == undefined){
                    nodes = $tbody.find('tr');
                }else{
                    node = this._get_item(index);
                    nodes.push(node);
                    if(cascade){
                        var children = this.getChildrenAll(node);
                        Array.prototype.push.apply(nodes, children);
                    }
                }
                
                for(var i=0; i<nodes.length; i++){
                    para.push(this.getKey(nodes[i]));
                }
                
                function f(data, is_direct){
                    if (!is_direct){
                        for(var i=0; i<data.length; i++){
                            var n = $self.findItem(data[i]);
                            $self._remove(n);
                        }
                    }else{
                        $self._remove(nodes);
                    }
                    
                    //更新所有父结点的样式
                    var parents = $self.getParents(node);
                    for(var i=0; i<parents.length; i++){
                        $self.updateStyle($(parents[i]));
                    }
                    $self._updateIndex();
                    $self._trigger($self.$body, {type:'deleted'}, data);
                    $self._setStyle();
                }
                
                this._bind_handler('delete', para, f);
            }
            
            /*
                发送事件，如果处理于初始化状态，则不发出事件
            */
            , _trigger: function(el, type, data){
                var e = $.Event(type);
                if(!this._initing)
                    $(el).trigger(e, data);
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
                        var col = leafCols[colIndex];
                        trHtml.push('<td class="');
                        var index =  $.inArray(col, expandCols);
                        trHtml.push(this._genColClass(index));
                        if(opts.nowrap){
                            trHtml.push(' nowrap');
                        }
                        trHtml.push('"><div class="mmg-cellWrapper"><div class="');
                        if(opts.nowrap){
                            trHtml.push('nowrap');
                        }
                        trHtml.push('"')
                        //如果是tree结点列，则每行预留一定的空白
                        if(colIndex == this._getColumnIndex(opts.treeColumn)){
                            var rowIndent = opts.showIcon ? opts.indent + opts.iconIndent+6 : opts.indent
                            trHtml.push(' style="padding-left:' + rowIndent + 'px"');
                        }
                        trHtml.push('>');
                        if(col.renderer){
                            trHtml.push(col.renderer(item[this._getColName(col)],item));
                        }else{
                            trHtml.push(item[this._getColName(col)]);
                        }
                        trHtml.push('</div>');
                        trHtml.push('</span></td>');
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
                if(this._initing) return;
                if (this.opts.bind){
                    if($.isFunction(this.opts.bindHandler)){
                        this.opts.bindHandler(action, data, callback);
                        return ;
                    }else if(typeof(this.opts.bindHandler) == 'string'){
                        data.action = action;
                        $.ajax({
                            url:this.opts.bindHandler,
                            type:'POST',
                            dataType:'json',
                            data:{action:action, data:JSON.stringify(data)}
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
                return this._collapse($(node), true);
            }
            
            , collapseById: function(nodeId){
                var node = this.findItem(nodeId);
                return this.collapse(node);
            }
            
            , collapseAll: function (){
                var children = this.getChildren();
                for (var i=0; i<children.length; i++){
                    this.collapse(children[i]);
                }
            }
            
            , expandAll: function (){
                var children = this.getChildren();
                for (var i=0; i<children.length; i++){
                    this.expand(children[i]);
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
            
            /*
                展开一个树结点
            */
            , expand: function (node) {
                if(!node || node.length == 0)
                    return ;
                    
                if(!node.hasClass('parent')) 
                    return ;
                    
                var $self = this;
                var data = this.row(node);
                var children = this.getChildren(node);
                
                if (node.hasClass('collapsed')){
                    node.removeClass("collapsed").addClass("expanded");
                    if(this.opts.showIcon) {
                        var icon = node.find('span.tree-icon');
                        icon.removeClass('tree-folder').addClass('tree-folder-open');
                    }
                
                    e = this._trigger(node, 'expand', data);
                    if(e.isDefaultPrevented()) return;
                    
                    if(children.length > 0){
                        children.each(function() {
                            if($(this).is(".parent.expanded")) {
                                $self.expand($(this));
                            }
                    
                            $(this).removeClass('ui-helper-hidden');
                    
                        });
                    }
                    //如果没有子结点，则判断是否装过数据，data('loaded')
                    //如果装过数据，则忽略
                    else{
                        if(!node.data('loaded')){
                            this.ajaxDo('expand', data);
                            node.data('loaded', true);
                        }
                    }
                    
                    this._trigger(node, 'expanded', data);
                }
            
              return node;
            }
            
            , expandById: function(nodeId) {
                var node = this.findItem(nodeId);
                return this.expand(node);
            }
            
            , ajaxDo: function (action, node) {
                if(this.opts.expandURL) {
                    var $self = this;
                    var data = {};
                    if (typeof this.opts.expandParam === 'string'){
                        data[this.opts.expandParam] = node[this.opts.expandParam];
                    }else if($.isPlainObject(this.opts.expandParam)){
                        $.each(this.opts.expandParam, function(k, v){
                            data[k] = node[v];
                        });
                    }
                    
                    $.ajax({
                        url: this.opts.expandURL,
                        type: this.opts.expandMethod || 'GET',
                        dataType:'json',
                        data:data
                    })
                    .done(function(r){
                        if($.isArray(r)) {
                            r = {success: true, data: r}
                        }
                        
                        if(r.success){
                            if(r.data){
                                var parentId = node[$self.opts.idField];
                                var parent = $self.findItem(parentId);
                                if($.isFunction($self.opts.expandFilter)) {
                                    var data = $self.opts.expandFilter(r.data, parentId);
                                    $self.addChild(data, parent)
                                } else {
                                    $self.addChild(r.data, parent)
                                }
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
                //console.log('ajaxdo', node, action);
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
                
                if (value){
                    $(node).attr(this.opts.parentAttrName, value);
                    data[this.opts.parentField] = value;
                    parent = this.findItem(value);
                    if (parent){
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
                    for(var i=0; i<this.$columns.length; i++){
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
            /*
                获得某个结点的子结点,如果node为undefined则返回所有顶层
                的结点
            */
            , getChildren: function(node){
                if(node)
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
                    }else if (!samelevel){
                        if (x < level){
                            return cur;
                        }

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
            
            , select: function(args){
                var opts = this.opts;
                var $body = this.$body;
            
                e = this._trigger($body, 'select');
                if(e.isDefaultPrevented()) return;

                if(typeof args === 'number'){
                    var $tr = $body.find('tr').eq(args);
                    if(!opts.multiSelect){
                        $body.find('tr.selected').removeClass('selected');
                        if(opts.checkCol){
                            $body.find('tr > td').find('.mmg-check').prop('checked','');
                        }
                    }
                    if(!$tr.hasClass('selected')){
                        $tr.addClass('selected');
                        if(opts.checkCol){
                            $tr.find('td .mmg-check').prop('checked','checked');
                        }
                    }
                }else if(typeof args === 'function'){
                    $.each($body.find('tr'), function(index){
                        if(args($.data(this, 'item'), index)){
                            var $this = $(this);
                            if(!$this.hasClass('selected')){
                                $this.addClass('selected');
                                if(opts.checkCol){
                                    $this.find('td .mmg-check').prop('checked','checked');
                                }
                            }
                        }
                    });
                }else if(args === undefined || (typeof args === 'string' && args === 'all')){
                    $body.find('tr.selected').removeClass('selected');
                    $body.find('tr').addClass('selected');
                    $body.find('tr > td').find('.mmg-check').prop('checked','checked');
                }else{
                    return;
                }
                
                if(opts.checkCol){
                    var $checks = $body.find('tr > td').find('.mmg-check');
                    if($checks.length === $checks.filter(':checked').length){
                        $head.find('th .checkAll').prop('checked','checked');
                    }
                }
                
                this._trigger($body, 'selected');
                
            }
                //取消选中
            , deselect: function(args){
                var opts = this.opts;
                var $body = this.$body;
                var $head = this.$head;
                
                e = this._trigger($body, 'deselect');
                if(e.isDefaultPrevented()) return;
                
                if(typeof args === 'number'){
                    $body.find('tr').eq(args).removeClass('selected');
                    if(opts.checkCol){
                        $body.find('tr').eq(args).find('td .mmg-check').prop('checked','');
                    }
                }else if(typeof args === 'function'){
                    $.each($body.find('tr'), function(index){
                        if(args($.data(this, 'item'), index)){
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
                }else{
                    return;
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
            */
            , _update: function(item, index){
                var opts = this.opts;
                var $tbody = this.$body.find('tbody');
                if(!$.isPlainObject(item)){
                    return ;
                }
                
                var that = this;
                var $tr = this._get_item(index);
                var checked = $tr.find('td:first :checkbox').is(':checked');
                var text;
                var cell;
                var data = this.row($tr);
                $.extend(data, item);
                
                $.each(data, function(key, value){
                    for(var colIndex=0; colIndex < that.$columns.length; colIndex++){
                        var col = that.$columns[colIndex];
                        if(that._getColName(col) == key){
                            if(col.renderer){
                                text = col.renderer(data[that._getColName(col)], data);
                            }else{
                                text = value;
                            }
                            cell = $tr.find('td:eq('+colIndex+')').find(opts.fieldTarget);
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

            , update: function(item, index){
                var data = this._update(item, index);
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
                    d[this.opts.idField] = this.getKey(node);
                    d[this.opts.orderingField] = this.row(n)[this.opts.orderingField];
                    para.push(d);
                    
                    d = {}
                    d[this.opts.idField] = this.getKey(n);
                    d[this.opts.orderingField] = data[this.opts.orderingField];
                    para.push(d);
                    
                    function f(){
                        for(i=0; i<children.length; i++){
                            n.before(children[i]);
                        }
                        $self.mergeData(para);
                        
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
                    //如果无子结点，ordering值可以不变
                    para.push(d);
                    
                    var children = this.getChildrenAll(node);
                    var x;
                    for(var i=0; i<children.length; i++){
                        x = this.row(children[i]);
                        d = {};
                        d[this.opts.idField] = x[this.opts.idField];
                        d['level'] = this._level(children[i])+1;
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
                    }
                    para.push(d);
                    
                    //将parent下的同级结点的ordering按node的ordering向后移动
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
                            para.push(d);
                        }
                    }
                    
                    var children = this.getChildrenAll(node);
                    for(i=0; i<children.length; i++){
                        x = this.row(children[i]);
                        d = {};
                        d[this.opts.idField] = x[this.opts.idField];
                        d['level'] = Math.max(0, this._level(children[i])-1);
                        para.push(d);
                    }
                    var nextNode = next;
                    while(nextNode){
                        d = {}
                        d[this.opts.idField] = this.row(nextNode)[this.opts.idField];
                        d[this.opts.parentField] = this.getKey(node);
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
                var $self = this;
                var cell = $(node.children("td")[this._getColumnIndex(this.opts.treeColumn)]);
                var target = cell.find(this.opts.fieldTarget);
                var a = cell.find('a.expander');
                var padding = this.opts.indent*(this._level(node)+1);
                var data = this.row(node);
                var children = this.getChildren(node);
                var parent = this.getParent(node);
                
                if (expandable || expandable === undefined)
                    expand = 'expanded'
                else
                    expand = 'collapsed';
                
                if(!node.hasClass('initialized') || force || 
                    (node.hasClass('parent') && children.length==0) || 
                    (!node.hasClass('parent') && children.length>0) ||
                    (node.hasClass('expanded') && !expand) ||
                    (node.hasClass('collapsed') && expand)){
                    
                    if(!node.hasClass('initialized'))
                        node.addClass('initialized');
                    
                    if(expandable && (!node.hasClass('expanded'))){
                        node.removeClass('collapsed').addClass('expanded');
                    }
                    if((expandable === false) && (!node.hasClass('collapsed')) && (children.length>0)){
                        node.removeClass('expanded').addClass('collapsed');
                    }
                    
                    //如果当前结点的数据中有_isParent或子结点数>0，则添加parent信息
                    if(data._isParent || children.length > 0) {
                        node.addClass("parent");
                    }else{
                        node.removeClass('parent');
                        cell.find('a.expander').remove();
                    }
                    if(this.opts.showIcon) {
                        var icon = cell.find('span.tree-icon');
                        if(icon.length==0) {
                            icon = $('<span class="tree-icon"></span>');
                            cell.children('div').prepend(icon);
                        }
                        target.css('paddingLeft', padding + this.opts.iconIndent+6);
                        icon.css('left', padding-16 + this.opts.iconIndent);
                        icon.removeClass('tree-file').removeClass('tree-folder').removeClass('tree-folder-open');
                        if (node.hasClass('parent')) {
                            if(node.hasClass('expanded')){
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
                    
                    if(node.hasClass('parent')){
                        if(this.opts.expandable) {
                            if (a.length==0){
                                a = $('<a href="#" title="' + this.opts.stringExpand + '" class="expander"></a>');
                                cell.children('div').prepend(a);
                                a.click(function() { $self.toggleExpand(node); return false; });
                                if(this.opts.clickableNodeNames) {
                                    a.css('cursor', "pointer");
                                    $(cell).click(function(e) {
                                        // Don't double-toggle if the click is on the existing expander icon
                                        if (e.target.className != 'expander') {
                                            $self.toggleExpand(node);
                                        }
                                    });
                                }
                            }
                        }
                        
                        if(!(node.hasClass("expanded") || node.hasClass("collapsed"))) {
                            node.addClass(expand);
                        }
                        
                    }

                    a.css('left', padding-16);
                }
            }
            /*
                在指定的行对应的列显示一个小图标
            */
            , set_notation: function(index, column, cls, message){
                var $tr = this._get_item(index);
                var cell = $($tr.children("td")[this._getColumnIndex(column)]);
                cell.removeClass('error').removeClass('warning').removeClass('success').remove('info');
                cell.addClass(cls);
                cell.attr('title', message);
                cell.find('.mmg-notation').remove();
                var item = $('<span class="mmg-notation '+cls+'" title="'+message+'"></span>');
                cell.find('div.mmg-cellWrapper').append(item);
            }
            
            /*
                在指定的行对应的列显示不同的背景
            */
            , set_cell_notation: function(index, column, cls, message){
                var $tr = this._get_item(index);
                var cell = $($tr.children("td")[this._getColumnIndex(column)]);
                cell.removeClass('error').removeClass('warning').removeClass('success').remove('info');
                cell.addClass(cls);
                cell.attr('title', message);
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
                var cell = $(node.children("td")[this._getColumnIndex(this.opts.treeColumn)]);
                var target = cell.find(this.opts.fieldTarget);
                var a = cell.find('a.expander');
                
                if(direction>0){
                    $(node).attr('level', this._level(node)+1);
                }
                else{
                    $(node).attr('level', Math.max(0, this._level(node)-1));
                }
                
                this.updateStyle(node, undefined, true);
            }
            
        } // end of methods
        
        
    } //end of treegrid

    //调用mmGrid插件初始化处理
    $.fn.mmGrid.addPlugin(treegrid);
    
})(jQuery);

