/**
* selectionWidget Widget
*
* This widget allows for the use of checkboxes and radio boxes alongside formBuilder
*
* Public Methods:
*   setLabel()
*   checkDirty()
*	 isDirty()
*   clear()
*   clearDirty()
*   set()
*   get()
*   validate()
*/

import $ from 'jquery';

import loadDomData from '../util/loadDomData';
import loadDomToggleData from '../util/loadDomToggleData';
import equals from '../util/equals';


import './selectionField.scss';

const statusNames = ['require', 'disable', 'error', 'hover', 'warn'];

export default {
	options: {
		require: undefined, // both the same
		required: undefined, // both the same
		label: '',
		/*
		 * TODO: refactor radios to a declarative API like other fields
		 */
		radioGroup: undefined // Radio specific
	},

	_create: function() {
		const self = this,
			e = self.element;

		e.addClass('selectionField-widget');

		
		self.dirty = false;

		const o = self.options;

		// Load DOM data settings into options + clean bools
		loadDomData(e, o, ['label']);
		loadDomToggleData(e, o, ['require', 'required']);

		o.required = o.require || o.required;

		// convert input to field format
		const field = self.field = $('<div class="selection-field"></div>');
		self.layers = {};

		// move DOM elements around
		e.before(field).appendTo(field);

		// Setup label from option/dom
		if(!o.label) {
			o.label = e.data('label');
		}
		if(o.label) {
			self.setLabel(o.label);
		}

		// move input classes to field
		if (e.attr('class')) {
			field.attr('class', $.trim(field.attr('class') + ' ' + e.attr('class')));	
		}
	
		e.removeAttr('class');

		// Checkbox or Radio?
		self.isRadio = e.is('[type="radio"]');

		/*
		 * if this field is not part of a group in its form, add a group class to this field for proper styling
		 */
		
		const parentContainer = field.closest('.selection-field-group', '.formBuilder-widget');

		if(!parentContainer.length || parentContainer.is('.formBuilder-widget')) {
			
			field.wrap('<div class="selection-field-group"/>');
			if(self.isRadio) {
				self.radioGroup = e;
			}
		}
		
		self.states = {};
		
		if(self.isRadio) {
			if(o.radioGroup) {
				self.radioGroup = o.radioGroup;
			} else {
				self.radioGroup = e;
			}
			// Keep prevValue in sync
			self._updatePreviousValue();

			// Keep any needed options in sync
			const widgets = self.radioGroup.not(e).filter('.selectionField-widget');

			if(!o.required) {
				widgets.each(function() {
					const ops = $(this).data('formBuilderSelectionField').options;
					if(ops.required) {
						o.required = ops.required;
						return false;
					}
				});
			}

			if(o.required) {
				widgets.each(function(){
					const sfw = $(this).data('formBuilderSelectionField');
					sfw.options.required = o.required;
				});
			}
		} else {
			self.prevValue = e.is(':checked');
		}

		// set the require option as a status
		self.status('require', o.required, false);

		e.change(function() {
			// TODO: change this to use errors + autoValidate
			self.validate();
		});

		field.mouseenter(function() {
			self.status('hover', true);
		}).mouseleave(function() {
			self.status('hover', false);
		});

		e.addClass('selectionField-widget');
	},

	setLabel: function(newLabel) {
		const self = this,
			e = self.element;

		// Assign unique id
		if(!self.label) {
			e.wrap('<label></label>');
			self.label = $('<span></span>');
			e.after(self.label);
		}

		self.label.html(newLabel);
	},

	// Keep prevValue in sync with all connected selectionWidgets
	_updatePreviousValue: function(value) {
		const self = this;

		if(!self.isRadio) {
			self.prevValue = !!value;
			return;
		}
		
		const prevValue = value || self.radioGroup.filter(':checked').val() || '';

		self.radioGroup.filter('.selectionField-widget').each(function(){
			$(this).find('.selectionField-widget').prevValue = prevValue;
		});
	},

	checkDirty: function() {
		const self = this;

		if(!self.dirty){
			const val = self.get();

			if(!equals(self.prevValue, val) && !(typeof self.prevValue === 'undefined' && !val)){
				// is dirty
				if(self.isRadio) {
					self.radioGroup.each(function() {
						const sfw = $(this).data('formBuilderSelectionField');
						sfw.dirty = true;
						sfw.field.addClass('dirty');
					});
				} else {
					self.dirty = true;
					self.field.addClass('dirty');
				}

				self._trigger('dirty');
			}
		} else {
			/*
			 * clean checks can be fired many times, so debouce them with a timer
			 */
			if(self.cleanCheckTimer){
				clearTimeout(self.cleanCheckTimer);
			}
			self.cleanCheckTimer = setTimeout(function() {
				const prev = self.prevValue,
					val = self.get();

				if(equals(prev,val)){
					self.clearDirty();
				}
			}, 300);
		}
	},

	isDirty: function() {
		return this.dirty;
	},

	clear: function() {
		const self = this;
		self.set();
	},

	clearDirty: function() {
		const self = this;

		if(self.cleanCheckTimer){
			clearTimeout(self.cleanCheckTimer);
		}

		if(self.isRadio) {
			self.radioGroup.each(function() {
				const sfw = $(this).data('formBuilderSelectionField');
				sfw.dirty = false;
				sfw.field.removeClass('dirty');
			});
		} else {
			self.dirty = false;
			self.field.removeClass('dirty');
		}


		self._trigger('clean');
	},

	conflicts: function(value) {
		const self = this;
		if(self.dirty && self.get() !== value){
			return {
				key: self.element.attr('name'),
				vOld: self.get(),
				vNew: value
			};
		}
		return null;
	},

	set: function(value) {
		const self = this,
			e = self.element;


		if(self.isRadio) {
			// Reset group
			self.radioGroup.removeAttr('checked');

			// Select passed value
			if(typeof(value) !== 'undefined') {
				self.radioGroup.filter('[value="'+value+'"]').prop('checked', true);
			}

			self._updatePreviousValue();

		} else {
			value = !!value;
			self.prevValue = value;
			e.prop('checked', self.prevValue);
		}

		self.clearDirty();
		self._trigger('afterset', null, [value]);
	},

	get: function() {
		const self = this,
			e = self.element;

		if(self.isRadio) {
			return self.radioGroup.filter(':checked').val();
		}

		return e.is(':checked');
	},

	validate: function(){
		const self = this,
			o = self.options,
			e = self.element;

		let isValid = true;

		if(o.required) {
			if(self.isRadio) {
				isValid = self.radioGroup.filter(':checked').length === 1;
			} else {
				isValid = !!e.prop('checked');
			}
		}

		// update error status
		self.status('error', !isValid);

		return isValid;
	},

	hide: function() {
		this.field.hide();
	},

	show: function() {
		this.field.show();
	},

	getField: function() {
		return this.field;
	},

	enable: function() {
		this.status('disable', false);
	},

	disable: function() {
		this.status('disable', true);
	},

	isDisabled: function() {
		return this.hasStatus('disable');
	},

	/*
	 * public status setters
	 */
	status: function(statusName, bool, fireEvents) {
		const self = this;

		/*
		 * only allow changes to status flags
		 */
		if($.inArray(statusName, statusNames) < 0) {
			return;
		}

		/*
		 * clean and set status in options
		 */
		const cleanBool = !!bool,
			states = self.states;

		if(cleanBool === states[statusName]) {
			/*
			 * this status is already set, ignore
			 */
			return;
		}

		states[statusName] = cleanBool;

		/*
		 * set the status class to the field
		 */
		if(states[statusName]) {
			self.field.addClass(statusName);
		} else {
			self.field.removeClass(statusName);
		}

		// Enforce high-level css
		if(statusName === 'disable') {
			self.field.css('pointer-events', cleanBool? 'none' : 'auto');
		}

		// Sync rest of radioGroup if needed
		if(self.isRadio && (statusName === 'disable' || statusName === 'error' || statusName === 'warn' || statusName === 'require')) {
			self.radioGroup.not(self.element).filter('.selectionField-widget').filter(function(){
				return $(this).selectionField('hasStatus', statusName) !== cleanBool;
			}).selectionField('status', statusName, bool, false);
		}

		/*
		 * fire statusUpdated event
		 */
		if(fireEvents !== false) {
			self._trigger('statusUpdate', null, {
				statusName: statusName,
				value: states[statusName]
			});
		}
	},

	hasStatus: function (statusName) {
		return !!this.states[statusName];
	},

	_destroy: function() {
		const self = this;

		if(self.radioGroup) {
			// Destroy all in radioGroup
			self.radioGroup.not(self.element).each(function() {
				const radio = $(this);
				radio.data('formBuilderSelectionField').radioGroup = undefined;
				radio.selectionField('destroy');
			});
		}
	}
};