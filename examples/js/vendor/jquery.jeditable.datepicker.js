$.editable.addInputType('datepicker', {
    element : function(settings, original) {
        var input = $('<input>');
        if (settings.width  != 'none') { input.width(settings.width-2);  }
        if (settings.height != 'none') { input.height(settings.height); }
        $(this).append(input);
        return(input);
    },
    plugin : function(settings, original) {
        var that = $(this);
        var el = that.find('input');
        
        settings.onblur = "ignore";
        
        var opts = $.extend({}, settings.inputOptions, {
            dateFormat: 'yy-mm-dd',
            onClose: function(){
                that.submit();
                el.focus();
            }
        });
        el.datepicker(opts);
    }
});