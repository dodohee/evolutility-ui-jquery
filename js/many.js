/*! ***************************************************************************
 *
 * evolutility :: many.js
 *
 * View many
 *
 * https://github.com/evoluteur/evolutility
 * Copyright (c) 2014, Olivier Giulieri
 *
 *************************************************************************** */

var Evol = Evol || {};

Evol.ViewMany = Backbone.View.extend({

    viewType:'many',
    editable: false,
    cardinality: 'n',

    options: {
        style: 'panel-info',
        pageSize: 20,
        pageIndex:0,
        autoUpdate: false,
        // router: ...
        //titleSelector: '#title',
        selectable: false,
        links: true,
        //noDataString: 'No data to display',
        iconsPath: 'pix/'
    },

    events: {
        'click .evol-sort-icons>i': 'click_sort',
        'click .pagination>li': 'click_pagination',
        //'click .evol-field-label .glyphicon-wrench': 'click_customize',
        'change .list-sel': 'click_selection',
        'change [data-id="cbxAll"]': 'click_checkall'
    },

    initialize: function (opts) {
        var lastSort = localStorage.getItem(opts.uiModel.id+'-sort'),
            that=this;

        _.extend(this.options, opts);
        this.uiModel=this.options.uiModel;
        this.pageIndex=this.options.pageIndex;
        this.mode=this.options.mode || '';
        this._filter=[];
        if(this.options.autoUpdate){
            if(this.collection){
                this.collection.on('change', function(){
                    that.render();
                });
            }
        }
        if(!this.options.router){
            this.$el.on('click', '.evol-nav-id', function(evt){
                that.click_navigate(evt);
            });
        }else{
            this.router=this.options.router;
        }
        this._custOn=false;
        if(lastSort!==null){
            var ls=lastSort.split('-'),
                f=this.getField(ls[0]);
            if(ls.length>1 && !_.isUndefined(f)){
                this.sortList(f, ls[1]==='down', true);
            }
        }
    },

    render:function(){
        var models=this.collection.models;
        if(this.collection.length){
            models=Evol.Dico.filterModels(models, this._filter);
            this._render(models);
        }else{
            this.$el.html(Evol.UI.HTMLMsg(this.options.noDataString || Evol.i18n.nodata, '', 'info'));
        }
        return this.setTitle();
    },

    _HTMLbody: function (h, fields, pSize, icon, pageIdx, selectable) {
        var models = this.collection.models,
            model,
            r,
            rMin = 0,
            rMax = _.min([models.length, rMin+pSize]),
            ico = icon?(this.options.iconsPath || '')+icon:null,
            route=this.getItemRoute();

        if(pageIdx > 0){
            rMin = pageIdx*pSize;
            rMax = _.min([models.length, rMin+pSize]);
        }
        if (rMax > 0) {
            for (r = rMin; r < rMax; r++) {
                model=models[r];
                this.HTMLItem(h, fields, model, ico, selectable, route);
            }
        }
    },

    _render:function(models){
        alert('_render must be overwritten');
    },

    _HTMLField: function(f, v){
        var fv=Evol.Dico.HTMLField4Many(f, v, Evol.hashLov, this.options.iconsPath || '');
        if(f.type==='list'){
            return _.escape(fv);
        }
        return fv;
    },

    _HTMLCheckbox: function(cid){
        return Evol.UI.input.checkbox2(cid, false, 'list-sel');
    },
/*
    customize: function () {
        var labels = this.$('th>span');
        if(this._custOn){
            labels.find('i').remove();
        }else{
            labels.append(Evol.UI.iconCustomize('id', 'field'));
        }
        this._custOn=!this._custOn;
        return this;
    },*/

    setCollection: function(collection){
        this.collection = collection;
        return this.render();
    },

    getCollection: function(){
        return this.collection;
    },

    setFilter: function(filter){
        this._filter=filter;
        return this;
    },

    getFilter: function(){
        return this._filter;
    },

    setTitle: function (){
        $(this.options.titleSelector).html(this.getTitle());
        return this;
    },

    getTitle: function (){
        return Evol.UI.capitalize(this.uiModel.entities)+' '+this.viewName;
    },

    getFields: function (){
        if(!this._fields){
            this._fields=Evol.Dico.getFields(this.uiModel, function(f){
                return f.viewmany;
            });
            this._fieldHash={};
            var that=this;
            _.each(this._fields,function(f){
                that._fieldHash[f.id]=f;
            });
        }
        return this._fields;
    },

    getField: function (fid){
        if(!this._fieldHash){
            this.getFields();
        }
        return this._fieldHash[fid];
    },

    setPage: function(pageIdx){
        var h = [],
            fields = this.getFields(),
            opts = this.options,
            pSize = opts.pageSize,
            collecLength = this.collection.length,
            pSummary = this.pageSummary(pageIdx, pSize, collecLength);

        this._HTMLbody(h, fields, pSize, this.uiModel.icon, pageIdx, opts.selectable);
        this._$body().html(h.join(''));
        h=[];
        this._HTMLpaginationBody(h, pageIdx, pSize, collecLength);
        this.$('.evo-pagination').html(h.join(''));
        this.$('.evo-many-summary').html(pSummary);
        this.pageIndex = pageIdx;
        this.$el.trigger('status', pSummary);
        return this;
    },

    getPage: function(){
        return this.pageIndex;
    },

    _$Selection:function(){
        return this.$('.list-sel:checked').not('[data-id="cbxAll"]');
    },

    getSelection:function(){
        if(this.options.selectable){
            return _.map(this._$Selection().toArray(), function(cbx){
                return $(cbx).data('id');
            });
        }
        return [];
    },

    pageSummary: function (pIdx, pSize, cSize) {
        if (cSize === 0) {
            return '';
        } else if (cSize === 1) {
            return cSize + ' ' + this.uiModel.entity;
        } else if(pSize>=cSize){
            return cSize + ' ' + this.uiModel.entities;
        } else {
            var rangeBegin = (pIdx || 0) * pSize + 1, rangeEnd;
            if (pIdx < 1) {
                rangeEnd = _.min([pSize, cSize]);
            } else {
                rangeEnd = _.min([rangeBegin + pSize -1, cSize]);
            }
            return Evol.i18n.range
                .replace('{0}', rangeBegin)
                .replace('{1}', rangeEnd)
                .replace('{2}', cSize)
                .replace('{3}', this.uiModel.entities);
        }
    },

    _HTMLpagination: function (h, pIdx, pSize, cSize) {
        if(cSize > pSize){
            h.push('<ul class="evo-pagination pagination pagination-sm">');
            this._HTMLpaginationBody(h, pIdx, pSize, cSize);
            h.push('</ul>');
        }
    },

    _HTMLpaginationBody: function (h, pIdx, pSize, cSize){
        if(cSize > pSize){
            var nbPages = Math.ceil(cSize / pSize),
                pId = pIdx + 1,
                iMin,
                iMax;

            if(nbPages<6){
                iMin = 1;
                iMax = nbPages;
            }else {
                iMin = pIdx + 1;
                iMax = iMin + 5;
            }
            h.push('<li data-id="prev"',
                (pId===1)?' class="disabled"':'',
                '><a href="#">&laquo;</a></li>');
            for (var i=iMin; i<iMax+1; i++) {
                h.push('<li',
                    (pId===i)?' class="active"':'',
                    ' data-id="', i, '"><a href="#">', i, '</a></li>');
            }
            h.push('<li data-id="next"',
                (cSize > pId * pSize)?'':' class="disabled"',
                '><a href="#">&raquo;</a></li>');
        }
    },

    sortList: function(f, down, noRemember){
        var collec = this.collection,
            ft = Evol.Dico.fieldTypes;
        if(!_.isUndefined(collec)){
            if(f.type==ft.text || f.type==ft.textml || f.type==ft.email){
                collec.comparator = Evol.Dico.bbComparatorText(f.id);
            }else if(f.value){
                collec.comparator = f.value;
            }else{
                collec.comparator = Evol.Dico.bbComparator(f.id);
            }
            collec.sort();
            if(down){
                collec.models.reverse();
            }
            this.setPage(0);
            var direction = down?'down':'up';
            if(!noRemember){
                localStorage.setItem(this.uiModel.id+'-sort', f.id+'-'+direction);
            }
            this.$el.trigger('list.sort', {id: f.id, direction:direction});
        }
    },

    getItemRoute: function(){
        var router = this.router,
            route = null;

        if(router){
            route = '#' + this.uiModel.id + '/view/';
        }
        return route;
    },

    click_navigate: function (evt) {
        var id=$(evt.currentTarget).closest('[data-mid]').data('mid');
        evt.type = 'list.navigate';
        this.$el.trigger(evt, {id: id});
    },

    click_sort: function (evt) {
        var target=$(evt.currentTarget),
            fid=target.parent().data('fid'),
            f=this.getField(fid),
            down=target.attr('class').indexOf('-down')>0;
        this.sortList(f,down);
        target.addClass('evol-last-sort');
    },

    click_pagination: function (evt) {
        this.$el.trigger('list.paginate', {id: $(evt.currentTarget).closest('li').data('id')});
    },
/*
    click_customize: function (evt) {
        var $e=$(evt.currentTarget),
            id=$e.data('id'),
            eType=$e.data('type');

        Evol.Dico.showDesigner(id, eType, $e);
        this.$el.trigger(eType+'.customize', {id: id, type:eType});
    },
*/
    click_selection: function (evt) {
        //if($(evt.currentTarget).data('id')!=='cbxAll'){
            this.$el.trigger('selection');
        //}
    },

    click_checkall: function (evt) {
        var isChecked=this.$('[data-id="cbxAll"]').prop('checked');
        //this.$('.list-sel:checked').not('[data-id="cbxAll"]');
        this.$('.list-sel').prop('checked', isChecked);
        this.$el.trigger('selection');
    }

});

