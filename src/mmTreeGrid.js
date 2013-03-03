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
            fieldTarget: 'div', //每个单元格的第一个子元素标签名，在生成每个单元格时要与此一致
            persist: false, //是否将折叠状态保存在cookie中
            persistCookiePrefix: 'treeTable_',
            persistCookieOptions: {},
            stringExpand: "Expand", //展开按钮的中文提示
            stringCollapse: "Collapse", //折叠按钮的中文提示
            idField: 'id',  //用来定义数据中主键key
            keyAttrName: 'id',  //将主键key写到tr元素时使用的属性名称
            parentField: '_parent',  //用来在数据中标识父结点的字段名
            readonly: true  //如果是只读，则不能进行add, remove, indent, unindent等编辑操作
        },
        
        _init: function(){
            //如果表格已经生成，则初始化树结构
            
            var $self = this;
            
            /*
            this.$body.find("tbody tr").each(function() {
                // Skip initialized nodes.
                if (!$(this).hasClass('initialized')) {
                    var isRootNode = (!$self._getParentValue(this));
            
                  // To optimize performance of indentation, I retrieve the padding-left
                  // value of the first root node. This way I only have to call +css+
                  // once.
//                    if (isRootNode && isNaN($self.opts.defaultPaddingLeft)) {
//                        $self.opts.defaultPaddingLeft = parseInt($($(this).children("td")[$self._getColumnIndex($self.opts.treeColumn)]).css('padding-left'), 10);
//                    }
            
                  // Set child nodes to initial state if we're in expandable mode.
                  if(!isRootNode && $self.opts.expandable && $self.opts.initialState == "collapsed") {
                    $(this).addClass('ui-helper-hidden');
                  }
            
                  // If we're not in expandable mode, initialize all nodes.
                  // If we're in expandable mode, only initialize root nodes.
                  if(!$self.opts.expandable || isRootNode) {
                        $self._init_tree($(this));
                  }
                }
            });
            
            */
            
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
                如果为undefined或null，则添加到最后
                position为插入的位置：before为向前插入， after为向后插入
                为每个结点添加一个level的值，这样后续计划缩近时可以使用这个值
                第一级为0
            */
            , _add : function(item, index, isChild, position, expand){
                var $tbody = this.$body.find('tbody');
                var nodes = [];
                var pos;
                
                position = position || 'after';
                
                //如果是数组，则按同组结点进行处理
                if($.isArray(item)){
                    for(var i=0; i < item.length; i++){
                        if(i == 0) pos = position;
                        else pos = 'after';
                        var d = this._add(item[i], index, isChild, pos, expand);
                        nodes.push(d);
                    }
                    
                    return nodes;
                }
                
                if(!$.isPlainObject(item)){
                    return ;
                }
                
//                var items = this.data();
                
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
                    e = this._trigger(this.$element, 'add', item);
                    if(e.isDefaultPrevented()) return;
                    $tbody.append($tr);
                    this._trigger($tr, 'added', item);
                }
                else{
                    //如果定义了父结点值，查找父结点是否存在，如果不存在则抛出错误
                    if (item[this.opts.parentField]){
                        parent = this.findItem(item[this.opts.parentField]);
                        if (!parent){
                            this._trigger(this.$element, {type:'error',
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
                        e = this._trigger(this.$element, 'add', item);
                        if(e.isDefaultPrevented()) return;
                        
                        //没找到则直接插入
                        if (!node) {
                            $tbody.append($tr);
                        }else{
                            //根据postion的指示插入结点
                            if (position == 'after'){
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
                        
                        this._trigger($tr, 'added', item);
                        
                    }
                }
                
                //如果有父结点，则处理父结点的样式
                if (parent){
                    e = this._trigger(this.$element, 'add', item);
                    if(e.isDefaultPrevented()) return;
                    
                    //插入到父结点的最后一个子结点后面
                    var children = this.getChildren(parent);
                    if(children.length > 0){
                        next = this.getNext($(children[children.length-1]));
                        if (next){
                            next.before($tr);
                        }
                        else
                            $tbody.append($tr);
                    }
                    else
                        parent.after($($tr));
                    
                    this._trigger($tr, 'added', item);
                    
                    var key = parent.attr(this.opts.keyAttrName);
                    this._setParentValue($tr, key);
                    $tr.attr('level', this._level(parent)+1);
                    
                    this.updateStyle(parent, true);
                }
                
                this.$count ++;
                
                //处理子结点
                if (item._children){
                    nodes = this._add(item._children, $tr, true, undefined, expand);
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
                var $self = this;
                var $body = this.$body;
                var items = [];
                var trs = $body.find('tbody tr['+$self.opts.idField+'="'+id+'"]');
                if (trs.length > 0)
                    return trs
                return ;
            }
            
            /*
                查找当前元素的上一个兄弟结点
            */
            
            , _populate: function(items){
                var opts = this.opts;
                var $body = this.$body;
            
                this._hideNoData();
                if(items && items.length !== 0 && opts.cols){
            
                    $body.empty().html('<tbody></tbody>');
                    this.add(items)
                }else{
                    $body.empty().html('<tbody><td style="border: 0px;background: none;">&nbsp;</td></tbody>');
                    this._showNoData();
                }
                this._setStyle();
            
                if(opts.fitColWidth && this._loadCount <= 1){
                    this._fitColWidth();
                }
            
                this._hideLoading();
            }
            
            //在某结点之后添加新结点
            , add: function(item, index, expand){
                var nodes = this._add(item, index, false, undefined, expand);
                for(var i=0; i<nodes.length; i++){
                    if(expand);
                    
                }
                this._setStyle();
            }
            
            //在某结点之前添加新结点
            , insert: function(item, index, expand){
                this._add(item, index, false, 'before', expand);
                this._setStyle();
            }
            
            
            , addChild: function(item, index, expand){
                this._add(item, index, true, undefined, expand);
                this._setStyle();
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
                return index;
            }

            /*
                删除行，参数可以为索引数组，同时増加是否删除标志
                如果数据中存在 _canDelete = false 则不允许删除
                index可以为索引或某个tr对象
                cascade表示是否同时删除子结点,如果不同时删除子结点
                则删除之后，其下的子结点将自动移到原结点的父结点上
                
                在每条记录删除时将可能触发以下几个事件：
                
                before
            */
            , remove: function(index, cascade){
                var $tbody = this.$body.find('tbody');
                var $self = this;
                var success = true;
                
                if(index == undefined){
                    var nodes = $tbody.find('tr');
                    if (nodes.length > 0){
                        nodes.each(function(){
                            success = $self._remove($(this), cascade);
                            if (!success){
                                success = false;
                                return success;
                            }
                        });
                    }
                }else{
                    success = this._remove(index, cascade);
                }
                this._setStyle();
                return success;
            }
            
            /*
                取某行的数据，如果index是tr元素，则直接获得数据
            */
            , itemData: function(index){
                var item = this._get_item(index);
                return item.data('item');
            }
            
            /*
                发送事件
            */
            , _trigger: function(el, type, data){
                var e = $.Event(type);
                $(el).trigger(e, data);
                return e;
            }
            
            /*
                删除某条记录，如果删除成功，则返回 true, 否则返回 false
            */
            , _remove: function(index, cascade){
                var success;
                var $self = this;
                
                if($.isArray(index)){
                    for(var i=index.length-1; i >= 0; i--){
                        success = this._remove(index[i], cascade);
                        if (!success) return false;
                    }
                    return true;
                }
                
                var item = this._get_item(index);
                
                if (!item){
                    return false;
                }
                
                var data = this.itemData(index);
                var e;
                
                //检查是否可以删除
                if (! (data._canDelete === false) ){
                
                    //发出beforeDelete事件
                    e = this._trigger(item, 'delete', data);
                    
                    //如果被中止，则取消删除
                    if (e.isDefaultPrevented()) return false;

                    //如果可以级联删除，则处理子结点
                    if (cascade){
                        //如果是树结点，则先删除子结点
                        var children = this.getChildren(item);
                        children.each(function(){
                            success = $self._remove($(this), cascade);
                            if (!success) return false;
                        });
                    }
                    
                    item.remove();
                    this.$count --;
                    
                    //原结点被删除，使用控件元素
                    this._trigger(this.$element, {type:'deleted'}, data);
                    
                    return true;
                }else{
                    //如果不能被删除，则发出不能删除事件
                    this._trigger(item, {type:'error', 
                        message:"Entry has _canDelete=false value, so it can't be deleted"},
                        data);
                    return false;
                }
            }
            
            //増加向tr中添加id的处理，因此要保证item有id属性
            //用户可以在options.idField中指定使用哪个key作为id值
            , _rowHtml: function(item){
            
                var opts = this.opts;

                if($.isPlainObject(item)){
                    var trHtml = [];
                    trHtml.push('<tr '+ opts.keyAttrName + '="' + item[opts.idField] + '">');
                    for(var colIndex=0; colIndex < opts.cols.length; colIndex++){
                        var col = opts.cols[colIndex];
                        trHtml.push('<td class="');
                        trHtml.push(this._genColClass(colIndex));
                        if(opts.nowrap){
                            trHtml.push(' nowrap');
                        }
                        trHtml.push('"><div class="');
                        if(opts.nowrap){
                            trHtml.push('nowrap');
                        }
                        trHtml.push('"')
                        //如果是tree结点列，则每行预留一定的空白
                        if(colIndex == this._getColumnIndex(opts.treeColumn)){
                            trHtml.push(' style="padding-left:' + opts.indent + 'px"');
                        }
                        trHtml.push('>');
                        if(col.renderer){
                            trHtml.push(col.renderer(item[col.name],item));
                        }else{
                            trHtml.push(item[col.name]);
                        }
            
                        trHtml.push('</span></td>');
                    };
                    trHtml.push('</tr>');
                    return trHtml.join('');
                }
            }
            
            , collapse: function (node){
                return this._collapse($(node), true);
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
                var data = this.itemData(node);
                
                if(node.hasClass('parent') && node.hasClass('expanded')){
                    if(first)
                        node.removeClass("expanded").addClass("collapsed");
                    else
                        node.addClass("collapsed");
                
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
                var data = this.itemData(node);
                var children = this.getChildren(node);
                
                if (node.hasClass('collapsed')){
                    node.removeClass("collapsed").addClass("expanded");
                
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
            
            , ajaxDo: function (node, action) {
                console.log('ajaxdo', node, action);
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
                
                if (value){
                    $(node).attr(this.opts.parentAttrName, value);
                    parent = this.findItem(value);
                    if (parent){
                        parent.data('loaded', true);
                    }
                }
                else{
                    $(node).removeAttr(this.opts.parentAttrName);
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
                    for(var i=0; i<this.opts.cols.length; i++){
                        if(this.opts.cols[i].name == index) return i;
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
                如果为false，则
            */
            , getNext: function(node, samelevel){
                if (!node || node.length==0) return ;
                
                var parent = this.getParent(node);
                var index;
                var children;
                
                //如果有父结点，则检查在父结点中的位置，如果是最后一个，则
                //向上找父结点的下一个结点，依此类推
                //不存在父结点，则从顶层开始计算
                children = this.getChildren(parent);
                index = children.index(node);
                if(index + 1 == children.length){
                    if(!samelevel){
                        if(parent)
                            return this.getNext(parent);
                    }
                    return ;
                }
                else{
                    return $(children[index+1]);
                }
                
            }
            
            /*
                获得当前结点的上一个同级结点,如果不存在则返回undefined
            */
            , getPrev: function (node){
                if (!node || node.length==0) return ;
                
                var parent = this.getParent(node);
                var index;
                var children;
                
                //如果有父结点，则检查在父结点中的位置，如果是最后一个，则
                //向上找父结点的下一个结点，依此类推
                //不存在父结点，则从顶层开始计算
                children = this.getChildren(parent);
                index = children.index(node);
                if(index > 0){
                    return $(children[index-1]);
                }
                else{
                    return ;
                }
                
            }
            
            , move: function (node, destination) {
                var $self = this;
                
                node.insertAfter(destination);
                this.getChildren(node).reverse().each(function() { 
                    $self.move($(this), node[0]); 
                });
            }
            
            , _moveChildren: function (node) {
                var $self = this;
                
                $.each(this.getChildren(node).get().reverse(), function(index, el) { 
                    node.after(el);
                    $self._moveChildren($(el)); 
                });
            }
            
            /*
                向上移动
            */
            , up: function (node) {
                var n = this.getPrev(node);
                if(n){
                    n.before(node);
                }
                
                this._moveChildren(node);
            }
            
            , down: function (node) {
                var n = this.getNext(node, true);
                if(n){
                    node.before(n);
                }
                
                this._moveChildren(node);
            }
            /*
                使当前结点向后缩近，变成上一结点的子结点
            */
            , indent: function (node, value) {
                var $self = this;
                var prev;
                var data = this.itemData(node);
                
                //取同级上一个结点
                prev = this.getPrev(node);
                if (prev){
                
                    e = this._trigger(node, 'indent', data);
                    if(e.isDefaultPrevented()) return;
                    
                    //将当前结点变为同级上一个结点的子结点
                    this._setParentValue(node, this.getKey(prev));
                    this._indent(node, 1, true);

                    this.updateStyle(prev);
                    
                    $self._trigger(node, 'indented', data);
                }
            }
            
            /*
                使当前结点向前缩近，变成当前结点父结点的子结点
            */
            , unindent: function (node, value) {
                var $self = this;
                var parent;
                var grandpar;
                var data = this.itemData(node);
                var next;
                
                parent = this.getParent(node);
                if (parent){
                
                    next = this.getNext(node, true);
                    
                    e = this._trigger(node, 'unindent', data);
                    if(e.isDefaultPrevented()) return;

                    grandpar = this.getParent(parent);
                    
                    if(grandpar){
                        //将当前结点变为祖父结点的子结点
                        this._setParentValue(node, grandpar.attr(this.opts.keyAttrName));
                    }
                    else{
                        //已经到顶层，则清除父结点信息
                        this._setParentValue(node);
                    }

                    this._indent(node, -1, true);
                    
                    //下一个同级结点应该是当前结点的子结点
                    if (next){
                        this._setParentValue(next, node.attr(this.opts.keyAttrName));
                    }
                    
                    this.updateStyle(parent);
                    this.updateStyle(node);
                    
                    $self._trigger(node, 'unindented', data);
                }
            }
            
            , updateStyle: function(node, expandable, force){
                var old_expand = expandable;
                var $self = this;
                var cell = $(node.children("td")[this._getColumnIndex(this.opts.treeColumn)]);
                var target = cell.find(this.opts.fieldTarget);
                var a = cell.find('a.expander');
                var padding = this.opts.indent*(this._level(node)+1);
                var data = this.itemData(node);
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
                    if((!expandable) && (!node.hasClass('collapsed'))){
                        node.removeClass('expanded').addClass('collapsed');
                    }
                    
                    //如果当前结点的数据中有_isParent或子结点数>0，则添加parent信息
                    if(data._isParent || children.length > 0) {
                        node.addClass("parent");
                        
//                        node.removeClass('collapsed').removeClass('expanded').addClass(expand);
                    }else{
                        node.removeClass('parent');
                        cell.find('a.expander').remove();
                    }
                    
                    if(node.hasClass('parent')){
                        if(this.opts.expandable) {
                            if (a.length==0){
                                a = $('<a href="#" title="' + this.opts.stringExpand + '" class="expander"></a>');
                                cell.prepend(a);
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
                    
                    target.css('paddingLeft', padding);
                    a.css('left', padding-10);
                }
            }
            
            /*
                使当前结，包括子结点向后缩近
            */
            , _indent: function (node, value, recursion){
                var $self = this;
                var cell = $(node.children("td")[this._getColumnIndex(this.opts.treeColumn)]);
                var target = cell.find(this.opts.fieldTarget);
                var a = cell.find('a.expander');
                
                if(value>0)
                    $(node).attr('level', this._level(node)+1);
                else
                    $(node).attr('level', Math.max(0, this._level(node)-1));
                
                this.updateStyle(node, undefined, true);
            
                if (recursion){
                    this.getChildren(node).each(function() {
                        $self._indent($(this), value, true);
                    });
                }
                
            }
            

            
        } // end of methods
        
        
    } //end of treegrid

    //调用mmGrid插件初始化处理
    $.fn.mmGrid.addPlugin(treegrid);
    
})(jQuery);

