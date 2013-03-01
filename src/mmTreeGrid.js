/*
 * Inspired from treeTable plugin
 */

!(function($) {

    var options;
    
    treegrid = {
        defaults: {
            childPrefix: "child-of-",
            clickableNodeNames: false,
            expandable: true,
            defaultPaddingLeft: 6,
            indent: 16,
            initialState: "collapsed",
            onNodeShow: null,
            onNodeHide: null,
            onExpand: null,
            onCollapse: null,
            treeColumn: 0,
            persist: false,
            persistCookiePrefix: 'treeTable_',
            persistCookieOptions: {},
            stringExpand: "Expand",
            stringCollapse: "Collapse",
            idField: 'id',  //用来定义数据中主键key
            keyField: 'id'  //将主键key写到tr元素时使用的属性名称
        },
        
        _init: function(){
            //如果表格已经生成，则初始化树结构
            
            options = this.opts;
            
            /*
            this.$body.find("tbody tr").each(function() {
                // Skip initialized nodes.
                if (!$(this).hasClass('initialized')) {
                  var isRootNode = ($(this)[0].className.search(options.childPrefix) == -1);
            
                  // To optimize performance of indentation, I retrieve the padding-left
                  // value of the first root node. This way I only have to call +css+
                  // once.
                  if (isRootNode && isNaN(defaultPaddingLeft)) {
                    defaultPaddingLeft = parseInt($($(this).children("td")[options.treeColumn]).css('padding-left'), 10);
                  }
            
                  // Set child nodes to initial state if we're in expandable mode.
                  if(!isRootNode && options.expandable && options.initialState == "collapsed") {
                    $(this).addClass('ui-helper-hidden');
                  }
            
                  // If we're not in expandable mode, initialize all nodes.
                  // If we're in expandable mode, only initialize root nodes.
                  if(!options.expandable || isRootNode) {
                    initialize($(this));
                  }
                }
            });
            */
            
        },
        
        methods: {
            /*
            数据格式为 {}或数组，其中如果数据中有 _isParent 则表示树结点
            _children 为 [] ，是当前结点的子结点
            index为指定的父结点，或者为序号或者为tr元素
            如果index为0，则插入最前面
            如果为undefined或null，则添加到最后
            */
            _addTreeNode : function(item, index, isChild){
                var $tbody = this.$body.find('tbody');
                var nodes = [];
                
                //如果是数组，则按同组结点进行处理
                if($.isArray(item)){
                    for(var i=item.length-1; i >= 0; i--){
                        //不刷新样式
                        $.merge(nodes, this._addTreeNode(item[i], index, true));
                    }
                    
                    return nodes;
                }
                
                if(!$.isPlainObject(item)){
                    return nodes;
                }
                
                var items = this.items();
                
                var $tr;
                var length;
                var position;
                var parent;
                
                if($.isNumeric(index)){
                    if(index < 0){
                        length = items.length;
                        position = 'tail';
                    }else if (index === 0){
                        if (isChild)
                            position = 'middle';
                        else
                            position = 'head';
                        length = index;
                    }else{
                        length = index;
                        position = 'middle';
                    }
                }else{
                    length = items.length;
                    if(index == undefined){
                        position = 'end';
                    }else 
                        position = 'middle';
                }
                
                $tr = $(this._rowHtml(item, items, length));
                //保存item.data数据
                $tr.data('item', item);
                
                //处理当前结点的样式
                if (item._isParent){
                    $tr.addClass('parent');
                }
                
                //处理插入位置
                if (position === 'head'){
                    $tbody.prepend($tr);
                }else if(position == 'end'){
                    $tbody.append($tr);
                }else{
                    //如果是中间有两种可能，一是顺序号，二是父结点
                    if ($.isNumeric(index)){
                        var idx = index - 1;
                        //如果要添加子结点，则index应为当前值
                        if(isChild)
                            idx = index;
                        var $before = $tbody.find('tr').eq(idx);
                        //找不到就插到最后
                        if($before.length === 0){
                            $tbody.append($tr);
                        }else{
                            if (isChild)
                                parent = $before;
                            else {
                                $before.after($tr);
                            }
                        }
                    }else{
                        if(isChild)
                            parent = index;
                        else {
                            index.after($tr);
                        }
                    }
                }
                
                //如果有父结点，则处理父结点的样式
                if (parent){
                    parent.after($($tr));
                    var key = parent.attr(this.opts.keyField);
                    $tr.addClass(this.opts.childPrefix + key);
                    if(!parent.hasClass('parent')){
                        parent.addClass('parent');
                    }
                    parent.removeClass('initialized');
                }
                
                //处理子结点
                if (item._children){
                    this._addTreeNode(item._children, $tr, true);
                }
                
                nodes.push(parent || $tr);
                return nodes
            }
            
            , _populate: function(items){
                var opts = this.opts;
                var $body = this.$body;
            
                this._hideNoData();
                if(items && items.length !== 0 && opts.cols){
            
                    $body.empty().html('<tbody></tbody>');
                    for (var i=0; i < items.length; i++){
                        this.add(items[i]);
                    }
                    /*
                    var tbodyHtmls = [];
                    tbodyHtmls.push('<tbody>');
                    for(var rowIndex=0; rowIndex < items.length; rowIndex++){
                        var item = items[rowIndex];
                        tbodyHtmls.push(this._rowHtml(item, items, rowIndex));
                    }
                    tbodyHtmls.push('</tbody>');
                    $body.empty().html(tbodyHtmls.join(''));
                    var $trs = $body.find('tr');
                    for(var rowIndex=0; rowIndex < items.length; rowIndex++){
                        $.data($trs.eq(rowIndex)[0],'item',items[rowIndex]);
                    }*/
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
                var nodes = this._addTreeNode(item, index, false);
                for(var i=0; i<nodes.length; i++){
                    initialize(nodes[i], expand);
                }
                this._setStyle();
            }
            
            , addChild: function(item, index, expand){
                var nodes = this._addTreeNode(item, index, true);
                for(var i=0; i<nodes.length; i++){
                    initialize(nodes[i], expand);
                }
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
                var $this = this;
                var success = true;
                
                if(index == undefined){
                    var nodes = $tbody.find('tr');
                    if (nodes.length > 0){
                        nodes.each(function(){
                            success = $this._remove($(this), cascade);
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
            , item: function(index){
                var item = this._get_item(index);
                return item.data('item');
            }
            
            /*
                删除某条记录，如果删除成功，则返回 true, 否则返回 false
            */
            , _remove: function(index, cascade){
                var success;
                var $this = this;
                
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
                
                var data = this.item(index);
                
                //检查是否可以删除
                if (! (data._canDelete === false) ){
                
                    //发出beforeDelete事件
                    var e = $.Event('beforeDelete');
                    item.trigger(e, data);
                    
                    //如果被中止，则取消删除
                    if (e.isDefaultPrevented()) return false;

                    //如果可以级联删除，则处理子结点
                    if (cascade){
                        //如果是树结点，则先删除子结点
                        var children = childrenOf(item);
                        children.each(function(){
                            success = $this._remove($(this), cascade);
                            if (!success) return false;
                        });
                    }
                    
                    var data = item.data('item');

                    item.remove();
                    
                    //原结点被删除，使用控件元素
                    this.$element.trigger({type:'afterDelete'}, data);
                    
                    return true;
                }else{
                    //如果不能被删除，则发出不能删除事件
                    item.trigger({type:'deleteFailed', 
                        message:"Entry has _canDelete=false value, so it can't be deleted"},
                        data);
                    return false;
                }
            }
            
            //増加向tr中添加id的处理，因此要保证item有id属性
            //用户可以在options.idField中指定使用哪个key作为id值
            , _rowHtml: function(item, items, rowIndex){
            
                var opts = this.opts;

                if($.isPlainObject(item)){
                    var trHtml = [];
                    trHtml.push('<tr '+ opts.keyField + '="' + item[opts.idField] + '">');
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
                        if(colIndex == opts.treeColumn){
                            trHtml.push(' style="padding-left:' + opts.indent + 'px"');
                        }
                        trHtml.push('>');
                        if(col.renderer){
                            trHtml.push(col.renderer(item[col.name],item,items,rowIndex));
                        }else{
                            trHtml.push(item[col.name]);
                        }
            
                        trHtml.push('</span></td>');
                    };
                    trHtml.push('</tr>');
                    return trHtml.join('');
                }
            }
            
        } // end of methods
        
        
    } //end of treegrid

    // === Private functions

    function ancestorsOf(node) {
      var ancestors = [];
      while(node = parentOf(node)) {
        ancestors[ancestors.length] = node[0];
      }
      return ancestors;
    };

    function childrenOf(node) {
      return $(node).siblings("tr." + options.childPrefix + node[0].id);
    };

    function getPaddingLeft(node) {
      var paddingLeft = parseInt(node[0].style.paddingLeft, 10);
      return (isNaN(paddingLeft)) ? options.defaultPaddingLeft : paddingLeft;
    }

    function indent(node, value) {
      var cell = $(node.children("td")[options.treeColumn]);
      cell[0].style.paddingLeft = getPaddingLeft(cell) + value + "px";

      childrenOf(node).each(function() {
        indent($(this), value);
      });
    };
    
    //expand 用来控制缺省是打开还是关闭，如果没传，则使用initialState配置项
    function initialize(node, expandable) {
      if (expandable == undefined)
        expandable = options.initialState;
      else if (expandable)
        expandable = 'expanded'
      else
        expandable = 'collapsed';
    
      if(!node.hasClass("initialized")) {
        node.addClass("initialized");

        var childNodes = childrenOf(node);

        if(!node.hasClass("parent") && childNodes.length > 0) {
          node.addClass("parent");
        }

        if(node.hasClass("parent")) {
          var cell = $(node.children("td")[options.treeColumn]);
          var padding = getPaddingLeft(cell) + options.indent;

          childNodes.each(function() {
            $(this).children("td")[options.treeColumn].style.paddingLeft = padding + "px";
          });

          if(options.expandable) {
            cell.prepend('<a href="#" title="' + options.stringExpand + '" style="left:'+(padding-16)+'px" class="expander"></a>');
            $(cell[0].firstChild).click(function() { toggleExpand(node); return false; });
            $(cell[0].firstChild).keydown(function(e) { if(e.keyCode == 13) {toggleExpand(node); return false; }});

            if(options.clickableNodeNames) {
              cell[0].style.cursor = "pointer";
              $(cell).click(function(e) {
                // Don't double-toggle if the click is on the existing expander icon
                if (e.target.className != 'expander') {
                  toggleExpand(node);
                }
              });
            }

            if (options.persist) {
              var cookieName = options.persistCookiePrefix + node.attr('id');
              if ($.cookie(cookieName) == 'true') {
                node.addClass('expanded');
              }
            }

            // Check for a class set explicitly by the user, otherwise set the default class
            if(!(node.hasClass("expanded") || node.hasClass("collapsed"))) {
              node.addClass(expandable);
            }

            if(node.hasClass("expanded")) {
              expand(node);
            }
            
            if(node.hasClass("collapsed")) {
              collapse(node);
            }
          }
        }
      }
    };

    function move(node, destination) {
      node.insertAfter(destination);
      childrenOf(node).reverse().each(function() { move($(this), node[0]); });
    };

    function parentOf(node) {
      var classNames = node[0].className.split(' ');

      for(var key=0; key<classNames.length; key++) {
        if(classNames[key].match(options.childPrefix)) {
          return $(node).siblings("#" + classNames[key].substring(options.childPrefix.length));
        }
      }

      return null;
    };
    
    function toggleExpand(node) {
      if(node.hasClass("collapsed")) {
        expand(node);
      } else {
        node.removeClass("expanded");
        collapse(node);
      }
    
      if (options.persist) {
        // Store cookie if this node is expanded, otherwise delete cookie.
        var cookieName = options.persistCookiePrefix + node.attr(options.keyField);
        $.cookie(cookieName, node.hasClass('expanded') ? 'true' : null, options.persistCookieOptions);
      }
    
      return this;
    };
    
    function collapse(node) {
      node.addClass("collapsed");
    
      if($.isFunction(options.onCollapse)){
        var r = options.onCollapse.call(node);
        if (r) return;
      }
      
      childrenOf(node).each(function() {
        if(!$(this).hasClass("collapsed")) {
          collapse($(this));
        }
    
        $(this).addClass('ui-helper-hidden');
    
        if($.isFunction(options.onNodeHide)) {
          options.onNodeHide.call(this);
        }
    
      });
    
      return node;
    };
    
    // Recursively show all node's children in a tree
    function expand(node) {
      node.removeClass("collapsed").addClass("expanded");
    
      if($.isFunction(options.onExpand)){
        var r = options.onExpand.call(node);
        if (r) return;
      }
    
      childrenOf(node).each(function() {
        initialize($(this));
    
        if($(this).is(".expanded.parent")) {
          expand($(this));
        }
    
        $(this).removeClass('ui-helper-hidden');
    
        if($.isFunction(options.onNodeShow)) {
          options.onNodeShow.call(this);
        }
      });
    
      return node;
    };
    

    //调用mmGrid插件初始化处理
    $.fn.mmGrid.addPlugin(treegrid);
    
})(jQuery);

