uli-gantt
===========
This project ships two jquery plugins: ulitree and uligantt.

ulitree is a tree extension of mmGrid. And uligantt is a gantt plugin.

It depends on:

* jquery
* d3.js
* mmGrid
* jeditable.js
* jquery.cookie.js
* splitter.js


## Screenshots


## Usage

### ulitree

Add lines to HTML page:

```
<link rel="stylesheet" href="mmGrid.css">
<link rel="stylesheet" href="mmPaginator.css">
<link rel="stylesheet" href="uliTreeGrid.css">
<script src="jquery.min.js"></script>
<script src="mmGrid.js"></script>
<script src="mmPaginator.js"></script>
<script src="uliTreeGrid.js"></script>
```

Add container tags to HTML page:

```
<table id="mmg"></table>
<div id="paginator" style="text-align: left;">
```

Add initialization javascript codes:

```
var items = [
    {name:'Requirement', 'begin_date':'2013-1-5', 'end_date':'2013-2-1', 'pre_task':'', type:'2', id:1}
    , {name:'Analysis', 'begin_date':'2013-1-5', 'end_date':'2013-2-1', 'pre_task':'', type:'2', _parent:1, id:2}
    , {name:'Review', 'begin_date':'2013-1-5', 'end_date':'2013-2-1', 'pre_task':'', type:'1', _parent:1, id:3}
    , {name:'Development', 'begin_date':'2013-1-5', 'end_date':'2013-2-1', 'pre_task':'', type:'2', id:4}
    , {name:'Summary', 'begin_date':'2013-1-5', 'end_date':'2013-2-1', 'pre_task':'', type:'2', _parent:4, id:5}
    , {name:'Detail', 'begin_date':'2013-1-5', 'end_date':'2013-2-1', 'pre_task':'', type:'2', _parent:4, id:6}
    , {name:'Develop', 'begin_date':'2013-1-5', 'end_date':'2013-2-1', 'pre_task':'', type:'2', _parent:4, id:7}
    , {name:'Coding', 'begin_date':'2013-1-5', 'end_date':'2013-2-1', 'pre_task':'', type:'2', _parent:7, id:8}
    , {name:'Unit Test', 'begin_date':'2013-1-5', 'end_date':'2013-2-1', 'pre_task':'', type:'2', _parent:7, id:9}
]

var cols = [
    {title:'ID_NAME', name:'id', width: 30, align: 'center',lockWidth:true},
    {title:'Title', name:'name' ,width:100, lockDisplay: true },
    {title:'Begin Date', name:'begin_date' ,width:100 },
    {title:'End Date', name:'end_date' ,width:100 },
    {title:'Pretend Task', name:'pre_task' ,width:100 }
];


$('#mmg').mmGrid({
    height: 300

    , cols: cols
    , method: 'get'
    , items: items
    , checkCol: true
    , fitColWidth: true
    , nowrap: true
    , fullWidthRows: false
    , indexCol: true

    //tree options

    , treeColumn: 'name'  //tree column
    , idField: 'id'  //id field key name, default is exact "id"
    , clickableNodeNames: true

    //add paginator
    , plugins: [
        $('#paginator').mmPaginator({limitList:[2,4,8]})
    ]
});
```

## License

This project releases under BSD license.
