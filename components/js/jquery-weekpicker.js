(function($, undefined) {

  $.widget('lugolabs.weekpicker', {
    _weekOptions: {
      showOtherMonths:   true,
      selectOtherMonths: true
    },

    _create: function() {
      var self = this;
      this._dateFormat = this.options.dateFormat || $.datepicker._defaults.dateFormat;
      var date = this._initialDate();
      this._setWeek(date);
      var onSelect = this.options.onSelect;
      this._picker = $(this.element).datepicker($.extend(this.options, this._weekOptions, {
        onSelect: function(dateText, inst) {
          self._select(dateText, inst, onSelect);
        },
        beforeShowDay: function(date) {
          return self._showDay(date);
        },
        onChangeMonthYear: function(year, month, inst) {
          self._selectCurrentWeek();
        }
      }));
      $(document)
        .on('mousemove',  '.ui-datepicker-calendar tr', function() { $(this).find('td a').addClass('ui-state-hover'); })
        .on('mouseleave', '.ui-datepicker-calendar tr', function() { $(this).find('td a').removeClass('ui-state-hover'); });
      this._picker.datepicker('setDate', date);
    },

    _initialDate: function() {
      if (this.options.currentText) {
        return $.datepicker.parseDate(this._dateFormat, this.options.currentText);
      } else {
		if (window.location.hash) {
			//set _initialDate based on URL hash
			var url_hash = window.location.hash.substr(1).replace('date=','').split('/');
			url_date = url_hash[2] + ',' + url_hash[1] + ',' + url_hash[0];
			return new Date(url_date);
		} else {
			//default date
			return new Date(2000, 0, 1);
		};
      }
    },

    _select: function(dateText, inst, onSelect) {
      this._setWeek(this._picker.datepicker('getDate'));
      var startDateText = $.datepicker.formatDate(this._dateFormat, this._startDate, inst.settings);
      this._picker.val(startDateText);
      if (onSelect) onSelect(dateText, startDateText, this._startDate, this._endDate, inst);
    },

    _showDay: function(date) {
      var cssClass = date >= this._startDate && date <= this._endDate ? 'ui-datepicker-current-day' : '';
      return [true, cssClass];
    },

    _setWeek: function(date) {
      var year = date.getFullYear(),
        month = date.getMonth(),
        day   = date.getDate() - date.getDay() - 1;
		if (date.getDay() == 6) {
			//this is saturday do you code here.
    	  	this._startDate = new Date(year, month, day + 7);
	      	this._endDate   = new Date(year, month, day + 13);
		} else {
	    	this._startDate = new Date(year, month, day);
      		this._endDate   = new Date(year, month, day + 6);
		}
    },

    _selectCurrentWeek: function() {
      $('.ui-datepicker-calendar')
        .find('.ui-datepicker-current-day a')
        .addClass('ui-state-active');
    }
  });

})(jQuery);