/*+***********************************************************************************
 * The contents of this file are subject to the vtiger CRM Public License Version 1.0
 * ("License"); You may not use this file except in compliance with the License
 * The Original Code is:  vtiger CRM Open Source
 * The Initial Developer of the Original Code is vtiger.
 * Portions created by vtiger are Copyright (C) vtiger.
 * All Rights Reserved.
 * Contributor(s): YetiForce.com
 *************************************************************************************/

Vtiger_Edit_Js("Products_Edit_Js", {}, {
	baseCurrency: '',
	baseCurrencyName: '',
	//Container which stores the multi currency element
	multiCurrencyContainer: false,
	//Container which stores unit price
	unitPrice: false,
	/**
	 * Function to get unit price
	 */
	getUnitPrice: function () {
		if (this.unitPrice == false) {
			this.unitPrice = $('input.unitPrice', this.getForm());
		}
		return this.unitPrice;
	},
	/**
	 * Function to get more currencies container
	 */
	getMoreCurrenciesContainer: function () {
		if (this.multiCurrencyContainer == false) {
			this.multiCurrencyContainer = $('.multiCurrencyEditUI');
		}
		return this.multiCurrencyContainer;
	},
	/**
	 * Function which aligns data just below global search element
	 */
	alignBelowUnitPrice: function (dataToAlign) {
		var parentElem = $('input[name="unit_price"]', this.getForm());
		dataToAlign.position({
			'of': parentElem,
			'my': "left top",
			'at': "left bottom",
			'collision': 'flip'
		});
		return this;
	},
	/**
	 * Function to get current Element
	 */
	getCurrentElem: function (e) {
		return $(e.currentTarget);
	},
	/**
	 *Function to register events for taxes
	 */
	registerEventForTaxes: function () {
		var thisInstance = this;
		var formElem = this.getForm();
		$('.taxes').on('change', function (e) {
			var elem = thisInstance.getCurrentElem(e);
			var taxBox = elem.data('taxName');
			if (elem.is(':checked')) {
				$('input[name=' + taxBox + ']', formElem).removeAttr('readonly');
			} else {
				$('input[name=' + taxBox + ']', formElem).attr('readonly', 'readonly');
			}

		});
		return this;
	},
	/**
	 * Function to register event for enabling base currency on radio button clicked
	 */
	registerEventForEnableBaseCurrency: function () {
		var container = this.getMoreCurrenciesContainer();
		var thisInstance = this;
		$(container).on('change', '.baseCurrency', function (e) {
			var elem = thisInstance.getCurrentElem(e);
			var parentElem = elem.closest('tr');
			if (elem.is(':checked')) {
				var convertedPrice = $('.convertedPrice', parentElem).val();
				thisInstance.baseCurrencyName = parentElem.data('currencyId');
				thisInstance.baseCurrency = convertedPrice;
			}
		});
		return this;
	},
	/**
	 * Function to register event for reseting the currencies
	 */
	registerEventForResetCurrency: function () {
		var container = this.getMoreCurrenciesContainer();
		var thisInstance = this;
		$(container).on('click', '.currencyReset', function (e) {
			var parentElem = thisInstance.getCurrentElem(e).closest('tr');
			var unitPriceFieldData = thisInstance.getUnitPrice().data();
			var unitPrice = thisInstance.getDataBaseFormatUnitPrice();
			var conversionRate = $('.conversionRate', parentElem).val();
			var price = parseFloat(unitPrice) * parseFloat(conversionRate);
			var calculatedPrice = app.parseNumberToShow(price);
			$('.convertedPrice', parentElem).val(calculatedPrice);
		});
		return this;
	},
	/**
	 *  Function to return stripped unit price
	 */
	getDataBaseFormatUnitPrice: function () {
		var field = this.getUnitPrice();
		var unitPrice = field.getNumberFromValue();
		return unitPrice;
	},
	calculateConversionRate: function () {
		var container = this.getMoreCurrenciesContainer();
		var baseCurrencyRow = container.find('.baseCurrency').filter(':checked').closest('tr');
		var baseCurrencyConvestationRate = baseCurrencyRow.find('.conversionRate');
		//if basecurrency has conversation rate as 1 then you dont have caliculate conversation rate
		if (baseCurrencyConvestationRate.val() == "1") {
			return;
		}
		var baseCurrencyRatePrevValue = baseCurrencyConvestationRate.val();

		container.find('.conversionRate').each(function (key, domElement) {
			var element = $(domElement);
			if (!element.is(baseCurrencyConvestationRate)) {
				var prevValue = element.val();
				element.val((prevValue / baseCurrencyRatePrevValue));
			}
		});
		baseCurrencyConvestationRate.val("1");
	},
	/**
	 * Function to register event for enabling currency on checkbox checked
	 */

	registerEventForEnableCurrency: function () {
		var container = this.getMoreCurrenciesContainer();
		var thisInstance = this;
		$(container).on('change', '.enableCurrency', function (e) {
			var elem = thisInstance.getCurrentElem(e);
			var parentRow = elem.closest('tr');

			if (elem.is(':checked')) {
				elem.attr('checked', "checked");
				var conversionRate = $('.conversionRate', parentRow).val();
				var unitPriceFieldData = thisInstance.getUnitPrice().data();
				var unitPrice = thisInstance.getDataBaseFormatUnitPrice();
				var price = parseFloat(unitPrice) * parseFloat(conversionRate);
				$('input', parentRow).attr('disabled', true).removeAttr('disabled');
				$('button.currencyReset', parentRow).attr('disabled', true).removeAttr('disabled');
				var calculatedPrice = app.parseNumberToShow(price);
				$('input.convertedPrice', parentRow).val(calculatedPrice);
			} else {
				var baseCurrency = $('.baseCurrency', parentRow);
				if (baseCurrency.is(':checked')) {
					var currencyName = $('.currencyName', parentRow).text();
					var params = {
						'type': 'error',
						'title': app.vtranslate('JS_ERROR'),
						'text': app.vtranslate('JS_BASE_CURRENCY_CHANGED_TO_DISABLE_CURRENCY') + '"' + currencyName + '"'
					};
					Vtiger_Helper_Js.showPnotify(params);
					elem.prop('checked', true);
					return;
				}
				$('input', parentRow).attr('disabled', true);
				$('input.enableCurrency', parentRow).removeAttr('disabled');
				$('button.currencyReset', parentRow).attr('disabled', 'disabled');
			}
		});
		return this;
	},
	/**
	 * Function to get more currencies UI
	 */
	getMoreCurrenciesUI: function () {
		var aDeferred = $.Deferred();
		var moduleName = app.getModuleName();
		var baseCurrency = $('input[name="base_currency"]').val();
		var recordId = $('input[name="record"]').val();
		var moreCurrenciesContainer = $('#moreCurrenciesContainer');
		moreCurrenciesUi = moreCurrenciesContainer.find('.multiCurrencyEditUI');
		var moreCurrenciesUi;

		if (moreCurrenciesUi.length == 0) {
			var moreCurrenciesParams = {
				'module': moduleName,
				'view': "MoreCurrenciesList",
				'currency': baseCurrency,
				'record': recordId
			};

			AppConnector.request(moreCurrenciesParams).then(
				function (data) {
					moreCurrenciesContainer.html(data);
					aDeferred.resolve(data);
				},
				function (textStatus, errorThrown) {
					aDeferred.reject(textStatus, errorThrown);
				}
			);
		} else {
			aDeferred.resolve();
		}
		return aDeferred.promise();
	},
	/*
	 * function to register events for more currencies link
	 */
	registerEventForMoreCurrencies: function () {
		var thisInstance = this;
		var form = this.getForm();
		$('#moreCurrencies').on('click', function (e) {
			var progressInstance = $.progressIndicator();
			thisInstance.getMoreCurrenciesUI().then(function (data) {
				var moreCurrenciesUi;
				moreCurrenciesUi = $('#moreCurrenciesContainer').find('.multiCurrencyEditUI');
				if (moreCurrenciesUi.length > 0) {
					moreCurrenciesUi = moreCurrenciesUi.clone(true, true);
					progressInstance.hide();
					var css = {'text-align': 'left', 'width': '65%'};
					var callback = function (data) {
						var params = app.validationEngineOptionsForRecord;
						var form = data.find('#currencyContainer');
						params.onValidationComplete = function (form, valid) {
							if (valid) {
								thisInstance.saveCurrencies();
							}
							return false;
						};
						form.validationEngine(params);
						app.showScrollBar(data.find('.currencyContent'), {'height': '400px'});
						thisInstance.baseCurrency = thisInstance.getUnitPrice().val();
						var multiCurrencyEditUI = $('.multiCurrencyEditUI');
						thisInstance.multiCurrencyContainer = multiCurrencyEditUI;
						thisInstance.calculateConversionRate();
						thisInstance.registerEventForEnableCurrency();
						thisInstance.registerEventForEnableBaseCurrency();
						thisInstance.registerEventForResetCurrency();
						thisInstance.triggerForBaseCurrencyCalc();
					};
					var moreCurrenciesContainer = $('#moreCurrenciesContainer').find('.multiCurrencyEditUI');
					var contentInsideForm = moreCurrenciesUi.find('.multiCurrencyContainer').html();
					moreCurrenciesUi.find('.multiCurrencyContainer').remove();
					var form = '<form id="currencyContainer"></form>';
					$(form).insertAfter(moreCurrenciesUi.find('.modal-header'));
					moreCurrenciesUi.find('form').html(contentInsideForm);
					moreCurrenciesContainer.find('input[name^=curname]').each(function (index, element) {
						var dataValue = $(element).val();
						var dataId = $(element).attr('id');
						moreCurrenciesUi.find('#' + dataId).val(dataValue);
					});
					var modalWindowParams = {
						data: moreCurrenciesUi,
						css: css,
						cb: callback
					};
					app.showModalWindow(modalWindowParams);
				}
			});
		});
	},
	/**
	 * Function to calculate base currency price value if unit
	 * present on click of more currencies
	 */
	triggerForBaseCurrencyCalc: function () {
		var multiCurrencyEditUI = this.getMoreCurrenciesContainer();
		var baseCurrency = multiCurrencyEditUI.find('.enableCurrency');
		$.each(baseCurrency, function (key, val) {
			if ($(val).is(':checked')) {
				var baseCurrencyRow = $(val).closest('tr');
				if (parseFloat(baseCurrencyRow.find('.convertedPrice').val()) == 0) {
					baseCurrencyRow.find('.currencyReset').trigger('click');
				}
			} else {
				$(val).closest('tr').find('.convertedPrice').val('');
			}
		});
	},
	/**
	 * Function to register onchange event for unit price
	 */
	registerEventForUnitPrice: function () {
		var thisInstance = this;
		var unitPrice = this.getUnitPrice();
		unitPrice.on('change', function () {
			thisInstance.triggerForBaseCurrencyCalc();
		});
	},
	registerRecordPreSaveEvent: function (form) {
		var thisInstance = this;
		if (typeof form === "undefined") {
			form = this.getForm();
		}

		form.on(Vtiger_Edit_Js.recordPreSave, function (e, data) {
			var multiCurrencyContent = $('#moreCurrenciesContainer').find('.currencyContent');
			var unitPrice = thisInstance.getUnitPrice();
			if ((multiCurrencyContent.length < 1) && (unitPrice.length > 0)) {
				e.preventDefault();
				thisInstance.getMoreCurrenciesUI().then(function (data) {
					thisInstance.preSaveConfigOfForm(form);
					InitialFormData = form.serialize();
					form.submit();
				});
			} else if (multiCurrencyContent.length > 0) {
				thisInstance.preSaveConfigOfForm(form);
			}
		});
	},
	/**
	 * Function to handle settings before save of record
	 */
	preSaveConfigOfForm: function (form) {
		var unitPrice = this.getUnitPrice();
		if (unitPrice.length > 0) {
			var unitPriceValue = unitPrice.val();
			var baseCurrencyName = form.find('[name="base_currency"]').val();
			form.find('[name="' + baseCurrencyName + '"]').val(unitPriceValue);
			form.find('#requstedUnitPrice').attr('name', baseCurrencyName).val(unitPriceValue);
		}
	},
	saveCurrencies: function () {
		var thisInstance = this;
		var errorMessage, params;
		var form = $('#currencyContainer');
		var editViewForm = thisInstance.getForm();
		var modalContainer = $('#'+Window.lastModalId);
		var enabledBaseCurrency = modalContainer.find('.enableCurrency').filter(':checked');
		if (enabledBaseCurrency.length < 1) {
			errorMessage = app.vtranslate('JS_PLEASE_SELECT_BASE_CURRENCY_FOR_PRODUCT');
			params = {
				text: errorMessage,
				'type': 'error'
			};
			Vtiger_Helper_Js.showMessage(params);
			form.removeData('submit');
			return;
		}
		enabledBaseCurrency.attr('checked', "checked");
		modalContainer.find('.enableCurrency').filter(":not(:checked)").removeAttr('checked');
		var selectedBaseCurrency = modalContainer.find('.baseCurrency').filter(':checked');
		if (selectedBaseCurrency.length < 1) {
			errorMessage = app.vtranslate('JS_PLEASE_ENABLE_BASE_CURRENCY_FOR_PRODUCT');
			params = {
				text: errorMessage,
				'type': 'error'
			};
			Vtiger_Helper_Js.showMessage(params);
			form.removeData('submit');
			return;
		}
		selectedBaseCurrency.attr('checked', "checked");
		modalContainer.find('.baseCurrency').filter(":not(:checked)").removeAttr('checked');
		var parentElem = selectedBaseCurrency.closest('tr');
		var convertedPrice = $('.convertedPrice', parentElem).val();
		thisInstance.baseCurrencyName = parentElem.data('currencyId');
		thisInstance.baseCurrency = convertedPrice;

		thisInstance.getUnitPrice().val(thisInstance.baseCurrency);
		$('input[name="base_currency"]', editViewForm).val(thisInstance.baseCurrencyName);

		var savedValuesOfMultiCurrency = modalContainer.find('.currencyContent').html();
		var moreCurrenciesContainer = $('#moreCurrenciesContainer');
		moreCurrenciesContainer.find('.currencyContent').html(savedValuesOfMultiCurrency);
		modalContainer.find('input[name^=curname]').each(function (index, element) {
			var dataValue = $(element).val();
			var dataId = $(element).attr('id');
			moreCurrenciesContainer.find('.currencyContent').find('#' + dataId).val(dataValue);
		});
		app.hideModalWindow();
	},
	registerSubmitEvent: function () {
		var editViewForm = this.getForm();
		editViewForm.on('submit', function (e) {
			//Form should submit only once for multiple clicks also
			if (typeof editViewForm.data('submit') !== "undefined") {
				return false;
			} else {
				var module = $(e.currentTarget).find('[name="module"]').val();
				if (editViewForm.validationEngine('validate')) {
					//Once the form is submiting add data attribute to that form element
					editViewForm.data('submit', 'true');
					//on submit form trigger the recordPreSave event
					var recordPreSaveEvent = $.Event(Vtiger_Edit_Js.recordPreSave);
					editViewForm.trigger(recordPreSaveEvent, {'value': 'edit'});
					if (recordPreSaveEvent.isDefaultPrevented()) {
						//If duplicate record validation fails, form should submit again
						editViewForm.removeData('submit');
						e.preventDefault();
					}
				} else {
					//If validation fails, form should submit again
					editViewForm.removeData('submit');
					app.formAlignmentAfterValidation(editViewForm);
				}
			}
		});
	},
	registerEventForUsageunit: function () {
		this.checkUsageUnit();
		$('select[name="usageunit"]').on('change', this.checkUsageUnit);
	},
	checkUsageUnit: function () {
		var selectUsageunit = $('select[name="usageunit"]');
		var inputQtyPerUnit = $('input[name="qty_per_unit"]');
		var value = selectUsageunit.val();
		if (value === 'pack') {
			inputQtyPerUnit.prop('disabled', false);
		} else {
			inputQtyPerUnit.prop('disabled', true);
		}
	},
	registerEvents: function () {
		this._super();
		this.registerEventForMoreCurrencies();
		this.registerEventForTaxes();
		this.registerEventForUnitPrice();
		this.registerRecordPreSaveEvent();
		this.registerEventForUsageunit();
	}
});
