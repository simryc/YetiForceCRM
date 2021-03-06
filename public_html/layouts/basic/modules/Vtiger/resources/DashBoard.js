/*+**********************************************************************************
 * The contents of this file are subject to the vtiger CRM Public License Version 1.1
 * ("License"); You may not use this file except in compliance with the License
 * The Original Code is:  vtiger CRM Open Source
 * The Initial Developer of the Original Code is vtiger.
 * Portions created by vtiger are Copyright (C) vtiger.
 * All Rights Reserved.
 * Contributor(s): YetiForce.com
 ************************************************************************************/

$.Class("Vtiger_DashBoard_Js", {
	gridster: false,
	//static property which will store the instance of dashboard
	currentInstance: false,
	addWidget: function (element, url) {
		element = $(element);
		var linkId = element.data('linkid');
		var name = element.data('name');
		var widgetId = element.data('id');
		$(element).parent().remove();
		if ($('ul.widgetsList li').length < 1) {
			$('ul.widgetsList').prev('button').css('visibility', 'hidden');
		}
		var widgetContainer = $('<li class="new dashboardWidget" id="' + linkId + '-' + widgetId + '" data-name="' + name + '" data-mode="open"></li>');
		widgetContainer.data('url', url);
		var width = element.data('width');
		var height = element.data('height');
		Vtiger_DashBoard_Js.gridster.add_widget(widgetContainer, width, height);
		Vtiger_DashBoard_Js.currentInstance.loadWidget(widgetContainer);
	},
	restrictContentDrag: function (container) {
		container.on('mousedown.draggable', function (e) {
			var element = $(e.target);
			var isHeaderElement = element.closest('.dashboardWidgetHeader').length > 0 ? true : false;
			if (isHeaderElement) {
				return;
			}
			//Stop the event propagation so that drag will not start for contents
			e.stopPropagation();
		});
	},
}, {
	container: false,
	noCache: false,
	instancesCache: {},
	init: function () {
		Vtiger_DashBoard_Js.currentInstance = this;
	},
	getContainer: function () {
		if (this.noCache == true || this.container == false) {
			this.container = $('.gridster ul');
		}
		return this.container;
	},
	getCurrentDashboard: function () {
		return $('.selectDashboard li a.active').closest('li').data('id');
	},
	getWidgetInstance: function (widgetContainer) {
		var id = widgetContainer.attr('id');
		if (this.noCache || !(id in this.instancesCache)) {
			var widgetName = widgetContainer.data('name');
			this.instancesCache[id] = Vtiger_Widget_Js.getInstance(widgetContainer, widgetName);
		}
		return this.instancesCache[id];
	},
	registerGridster: function () {
		const thisInstance = this;
		let baseWidth = thisInstance.getContainer().width();
		const options = {
			widget_margins: [7, 7],
			widget_base_dimensions: [((baseWidth / 12) - 14), 100],
			min_cols: 6,
			min_rows: 20,
			max_size_x: 12,
			draggable: {
				'stop': function () {
					thisInstance.savePositions($('.dashboardWidget'));
				}
			}
		};
		Vtiger_DashBoard_Js.gridster = this.getContainer().gridster(options).data('gridster');
		// load widgets after gridster initialization to prevent too early lazy loading - visible viewport changes
		this.loadWidgets();
		// recalculate positions with scrollbars
		if (this.getContainer().width() !== this.getContainer().parent().width()) {
			const parentWidth = thisInstance.getContainer().parent().width();
			this.getContainer().css('width', parentWidth + 'px');
			options.widget_base_dimensions = [((parentWidth / 12) - 14), 100];
			Vtiger_DashBoard_Js.gridster.options = $.extend(true, Vtiger_DashBoard_Js.gridster.options, options);
			Vtiger_DashBoard_Js.gridster.generate_grid_and_stylesheet();
		}
	},
	savePositions: function (widgets) {
		var widgetRowColPositions = {};
		for (var index = 0, len = widgets.length; index < len; ++index) {
			var widget = $(widgets[index]);
			widgetRowColPositions[widget.attr('id')] = JSON.stringify({
				row: widget.attr('data-row'), col: widget.attr('data-col')
			});
		}
		this.updateLazyWidget();
		AppConnector.request({
			module: app.getModuleName(),
			action: 'SaveWidgetPositions',
			'positionsmap': widgetRowColPositions
		});
	},
	updateLazyWidget() {
		const scrollTop = $('.mainBody').scrollTop();
		$('.mainBody').scrollTop(scrollTop + 1).scrollTop(scrollTop);
	},
	loadWidgets: function () {
		const thisInstance = this;
		thisInstance.getContainer().find('.dashboardWidget').Lazy({
			threshold: 0,
			appendScroll: $('.mainBody'),
			widgetLoader(element) {
				thisInstance.loadWidget(element);
			},
		});
		this.updateLazyWidget();
	},
	loadWidget: function (widgetContainer) {
		var thisInstance = this;
		var urlParams = widgetContainer.data('url');
		var mode = widgetContainer.data('mode');
		widgetContainer.progressIndicator();
		if (mode === 'open') {
			var name = widgetContainer.data('name');
			var cache = widgetContainer.data('cache');
			var userId = CONFIG.userId;
			if (cache === 1) {
				var cecheUrl = app.cacheGet(name + userId, false);
				urlParams = cecheUrl ? cecheUrl : urlParams;
			}
			AppConnector.request(urlParams).then(function (data) {
				widgetContainer.html(data);
				App.Fields.Picklist.showSelect2ElementView(widgetContainer.find('.select2'));
				thisInstance.getWidgetInstance(widgetContainer);
				widgetContainer.trigger(Vtiger_Widget_Js.widgetPostLoadEvent);
				const headerHeight = widgetContainer.find('.dashboardWidgetHeader').outerHeight();
				let adjustedHeight = widgetContainer.height() - headerHeight;
				if (widgetContainer.find('.dashboardWidgetFooter').length) {
					adjustedHeight -= widgetContainer.find('.dashboardWidgetFooter').outerHeight();
				}
				const widgetContent = widgetContainer.find('.dashboardWidgetContent');
				widgetContent.css('max-height', adjustedHeight + 'px');
				app.showNewScrollbar(widgetContent, {wheelPropagation: true});
			});
		}
	},
	gridsterStop: function () {
		var gridster = Vtiger_DashBoard_Js.gridster;

	},
	registerRefreshWidget: function () {
		var thisInstance = this;
		this.getContainer().on('click', 'a[name="drefresh"]', function (e) {
			var element = $(e.currentTarget);
			var parent = element.closest('li');
			var widgetInstnace = thisInstance.getWidgetInstance(parent);
			widgetInstnace.refreshWidget();
			return;
		});
	},
	removeWidget: function () {
		const thisInstance = this;
		this.getContainer().on('click', 'li a[name="dclose"]', function (e) {
			var element = $(e.currentTarget);
			var listItem = $(element).parents('li');
			var width = listItem.attr('data-sizex');
			var height = listItem.attr('data-sizey');

			var url = element.data('url');
			var parent = element.closest('.dashboardWidgetHeader').parent();
			var widgetName = parent.data('name');
			var widgetTitle = parent.find('.dashboardTitle').attr('title');

			var message = app.vtranslate('JS_ARE_YOU_SURE_TO_DELETE_WIDGET') + " [" + widgetTitle + "]. " + app.vtranslate('JS_ARE_YOU_SURE_TO_DELETE_WIDGET_INFO');
			Vtiger_Helper_Js.showConfirmationBox({'message': message}).then(
				function (e) {
					AppConnector.request(url).then(
						function (response) {
							if (response.success) {
								var nonReversableWidgets = [];
								parent.fadeOut('slow', function () {
									parent.remove();
								});
								if ($.inArray(widgetName, nonReversableWidgets) == -1) {
									Vtiger_DashBoard_Js.gridster.remove_widget(element.closest('li'));
									$('.widgetsList').prev('button').css('visibility', 'visible');
									var data = '<li class="d-flex flex-row-reverse align-items-center">';
									if (response.result.deleteFromList) {
										data += '<button ';
										data += 'data-widget-id="' + response.result.id + '" ';
										data += 'class="removeWidgetFromList btn btn-danger btn-sm m-1 p-1" '
										data += '>'
										data += '<span class="fas fa-trash-alt"></span>';
										data += '</button>';
									}
									data += '<a onclick="Vtiger_DashBoard_Js.addWidget(this, \'' + response.result.url + '\')" ';
									data += 'href="javascript:void(0);" ';
									data += 'class="dropdown-item pl-1" ';
									data += 'data-linkid="' + response.result.linkid + '" ';
									data += 'data-name="' + response.result.name + '" ';
									data += 'data-width="' + width + '" ';
									data += 'data-height="' + height + '" ';
									data += '>';
									data += response.result.title + '</a>';
									data += '</li>';
									var divider = $('.widgetsList .dropdown-divider');
									if (divider.length) {
										$(data).insertBefore(divider);
									} else {
										$('.widgetsList').append(data);
									}
									thisInstance.updateLazyWidget();
								}
							}
						}
					);
				},
				function (error, err) {
				}
			);
		});
	},
	registerSelectDashboard: function () {
		var thisInstance = this;
		$('.selectDashboard li').on('click', function (e) {
			var progressIndicatorElement = $.progressIndicator({
				'position': 'html',
				'blockInfo': {
					'enabled': true
				}
			});
			var currentTarget = $(e.currentTarget);
			var dashboardId = currentTarget.data('id');
			var params = {
				module: app.getModuleName(),
				view: app.getViewName(),
				dashboardId: dashboardId
			};
			AppConnector.request(params).then(function (data) {
				progressIndicatorElement.progressIndicator({'mode': 'hide'});
				$('.dashboardViewContainer').html(data);
				thisInstance.noCache = true;
				thisInstance.registerEvents();
			});
		});
	},
	registerDatePickerHideInitiater: function () {
		var container = this.getContainer();
		container.on('click', 'input.dateRange', function (e) {
			var widgetContainer = $(e.currentTarget).closest('.dashboardWidget');
			var dashboardWidgetHeader = $('.dashboardWidgetHeader', widgetContainer);

			var callbackFunction = function () {
				var date = $('.dateRange');
				date.DatePickerHide();
				date.blur();
			};
			//adding clickoutside event on the dashboardWidgetHeader
			Vtiger_Helper_Js.addClickOutSideEvent(dashboardWidgetHeader.find('.dateRange'), callbackFunction);
			return false;
		});
	},
	registerShowMailBody: function () {
		var container = this.getContainer();
		container.on('click', '.showMailBody', function (e) {
			var widgetContainer = $(e.currentTarget).closest('.mailRow');
			var mailBody = widgetContainer.find('.mailBody');
			var bodyIcon = $(e.currentTarget).find('.body-icon');
			if (mailBody.css("display") == 'none') {
				mailBody.show();
				bodyIcon.removeClass("fa-chevron-down").addClass("fa-chevron-up");
			} else {
				mailBody.hide();
				bodyIcon.removeClass("fa-chevron-up").addClass("fa-chevron-down");
			}
		});
	},
	registerChangeMailUser: function () {
		var thisInstance = this;
		var container = this.getContainer();

		container.on('change', '#mailUserList', function (e) {
			var element = $(e.currentTarget);
			var parent = element.closest('li');
			var contentContainer = parent.find('.dashboardWidgetContent');
			var optionSelected = $("option:selected", this);
			var url = parent.data('url') + '&user=' + optionSelected.val();

			var params = {};
			params.url = url;
			params.data = {};
			contentContainer.progressIndicator({});
			AppConnector.request(params).then(
				function (data) {
					contentContainer.progressIndicator({'mode': 'hide'});
					parent.html(data).trigger(Vtiger_Widget_Js.widgetPostRefereshEvent);
				},
				function () {
					contentContainer.progressIndicator({'mode': 'hide'});
				}
			);
		});
	},
	registerChartFilterWidget: function () {
		var thisInstance = this;
		$('.dashboardHeading').off('click', '.addChartFilter').on('click', '.addChartFilter', function (e) {
			var element = $(e.currentTarget);
			var fieldTypeToGroup = ['currency', 'double', 'percentage', 'integer'];
			app.showModalWindow(null, "index.php?module=Home&view=ChartFilter&step=step1", function (wizardContainer) {
				var form = $('form', wizardContainer);
				form.on("keypress", function (event) {
					return event.keyCode != 13;
				});
				var sectorContainer = form.find('.sectorContainer');
				var chartType = $('select[name="chartType"]', wizardContainer);
				var moduleNameSelectDOM = $('select[name="module"]', wizardContainer);
				App.Fields.Picklist.showSelect2ElementView(sectorContainer.find('.select2'));
				var moduleNameSelect2 = App.Fields.Picklist.showSelect2ElementView(moduleNameSelectDOM, {
					placeholder: app.vtranslate('JS_SELECT_MODULE')
				});
				var step1 = $('.step1', wizardContainer);
				var step2 = $('.step2', wizardContainer);
				var step3 = $('.step3', wizardContainer);
				var footer = $('.modal-footer', wizardContainer);
				step2.remove();
				step3.remove();
				footer.hide();
				chartType.on('change', function (e) {
					var currentTarget = $(e.currentTarget);
					var value = currentTarget.val();
					if (value == 'Barchat' || value == 'Horizontal') {
						form.find('.isColorContainer').removeClass('d-none');
					} else {
						form.find('.isColorContainer').addClass('d-none');
					}
					if (wizardContainer.find('#widgetStep').val() == 4) {
						wizardContainer.find('.step3 .groupField').trigger('change');
					}
				});
				moduleNameSelect2.on('change', function () {
					if (!moduleNameSelect2.val())
						return;
					footer.hide();
					wizardContainer.find('.step2').remove();
					wizardContainer.find('.step3').remove();
					AppConnector.request({
						module: 'Home',
						view: 'ChartFilter',
						step: 'step2',
						chartType: chartType.val(),
						selectedModule: moduleNameSelect2.val()
					}).then(function (step2Response) {
						step1.after(step2Response);
						wizardContainer.find('#widgetStep').val(2);
						const step2 = wizardContainer.find('.step2');
						footer.hide();
						const filtersIdElement = step2.find('.filtersId');
						const valueTypeElement = step2.find('.valueType');
						App.Fields.Picklist.showSelect2ElementView(filtersIdElement);
						App.Fields.Picklist.showSelect2ElementView(valueTypeElement);
						step2.find('.filtersId, .valueType').on('change', function () {
							wizardContainer.find('.step3').remove();
							wizardContainer.find('.step4').remove();
							AppConnector.request({
								module: 'Home',
								view: 'ChartFilter',
								step: 'step3',
								selectedModule: moduleNameSelect2.val(),
								chartType: chartType.val(),
								filtersId: filtersIdElement.val(),
								valueType: valueTypeElement.val(),
							}).then(function (step3Response) {
								step2.last().after(step3Response);
								wizardContainer.find('#widgetStep').val(3);
								var step3 = wizardContainer.find('.step3');
								App.Fields.Picklist.showSelect2ElementView(step3.find('select'));
								footer.hide();
								step3.find('.groupField').on('change', function () {
									wizardContainer.find('.step4').remove();
									var groupField = $(this);
									if (!groupField.val())
										return;
									footer.show();
									AppConnector.request({
										module: 'Home',
										view: 'ChartFilter',
										step: 'step4',
										selectedModule: moduleNameSelect2.val(),
										filtersId: filtersIdElement.val(),
										groupField: groupField.val(),
										chartType: chartType.val()
									}).then(function (step4Response) {
										step3.last().after(step4Response);
										wizardContainer.find('#widgetStep').val(4);
										var step4 = wizardContainer.find('.step4');
										App.Fields.Picklist.showSelect2ElementView(step4.find('select'));
									});
								});
							});
						});
					})
				});
				form.on('submit', function (e) {
					e.preventDefault();
					const selectedModule = moduleNameSelect2.val();
					const selectedModuleLabel = moduleNameSelect2.find(':selected').text();
					let selectedFiltersId = form.find('.filtersId').val();
					if (Array.isArray(selectedFiltersId)) {
						selectedFiltersId = selectedFiltersId.join(',');
					}
					const selectedFilterLabel = form.find('.filterId').find(':selected').text();
					const selectedFieldLabel = form.find('.groupField').find(':selected').text();
					const data = {
						module: selectedModule,
						groupField: form.find('.groupField').val(),
						chartType: chartType.val(),
					};
					form.find('.saveParam').each(function (index, element) {
						element = $(element);
						if (!(element.is('input') && element.prop('type') === 'checkbox' && !element.prop('checked'))) {
							data[element.attr('name')] = element.val();
						}
					});
					thisInstance.saveChartFilterWidget(data, element, selectedModuleLabel, selectedFiltersId, selectedFilterLabel, selectedFieldLabel, form);
				});
			});
		});
	},
	saveChartFilterWidget: function (data, element, moduleNameLabel, filtersId, filterLabel, groupFieldName, form) {
		const thisInstance = this;
		const paramsForm = {
			data: JSON.stringify(data),
			blockid: element.data('block-id'),
			linkid: element.data('linkid'),
			label: moduleNameLabel + ' - ' + filterLabel + ' - ' + groupFieldName,
			name: 'ChartFilter',
			title: form.find('[name="widgetTitle"]').val(),
			filtersId: filtersId,
			isdefault: 0,
			height: 4,
			width: 4,
			owners_all: ["mine", "all", "users", "groups"],
			default_owner: 'mine',
			dashboardId: thisInstance.getCurrentDashboard()
		};
		const sourceModule = $('[name="selectedModuleName"]').val();
		thisInstance.saveWidget(paramsForm, 'add', sourceModule, paramsForm.linkid).then(
			function (data) {
				var result = data['result'];
				var params = {};
				if (data['success']) {
					app.hideModalWindow();
					paramsForm['id'] = result['id'];
					paramsForm['status'] = result['status'];
					params['text'] = result['text'];
					params['type'] = 'success';
					var linkElement = element.clone();
					linkElement.data('name', 'ChartFilter');
					linkElement.data('id', result['wid']);
					Vtiger_DashBoard_Js.addWidget(linkElement, 'index.php?module=Home&view=ShowWidget&name=ChartFilter&linkid=' + element.data('linkid') + '&widgetid=' + result['wid'] + '&active=0');
					Vtiger_Helper_Js.showMessage(params);
				} else {
					var message = data['error']['message'];
					if (data['error']['code'] != 513) {
						var errorField = form.find('[name="fieldName"]');
					} else {
						var errorField = form.find('[name="fieldLabel"]');
					}
					errorField.validationEngine('showPrompt', message, 'error', 'topLeft', true);
				}
			}
		);
	},
	registerMiniListWidget: function () {
		const thisInstance = this;
		$('.dashboardHeading').off('click', '.addFilter').on('click', '.addFilter', function (e) {
			const element = $(e.currentTarget);

			app.showModalWindow(null, "index.php?module=Home&view=MiniListWizard&step=step1", function (wizardContainer) {
				const form = $('form', wizardContainer);
				form.on("keypress", function (event) {
					return event.keyCode != 13;
				});
				const moduleNameSelectDOM = $('select[name="module"]', wizardContainer);
				const filteridSelectDOM = $('select[name="filterid"]', wizardContainer);
				const fieldsSelectDOM = $('select[name="fields"]', wizardContainer);
				const filterFieldsSelectDOM = $('select[name="filter_fields"]', wizardContainer);

				const moduleNameSelect2 = App.Fields.Picklist.showSelect2ElementView(moduleNameSelectDOM, {
					placeholder: app.vtranslate('JS_SELECT_MODULE')
				});
				const filteridSelect2 = App.Fields.Picklist.showSelect2ElementView(filteridSelectDOM, {
					placeholder: app.vtranslate('JS_PLEASE_SELECT_ATLEAST_ONE_OPTION'),
					dropdownParent: wizardContainer
				});
				const fieldsSelect2 = App.Fields.Picklist.showSelect2ElementView(fieldsSelectDOM, {
					placeholder: app.vtranslate('JS_PLEASE_SELECT_ATLEAST_ONE_OPTION'),
					closeOnSelect: true,
					maximumSelectionLength: 6
				});
				const filterFieldsSelect2 = App.Fields.Picklist.showSelect2ElementView(filterFieldsSelectDOM, {
					placeholder: app.vtranslate('JS_PLEASE_SELECT_ATLEAST_ONE_OPTION'),
				});
				const footer = $('.modal-footer', wizardContainer);

				filteridSelectDOM.closest('tr').hide();
				fieldsSelectDOM.closest('tr').hide();
				footer.hide();

				moduleNameSelect2.on('change', function () {
					if (!moduleNameSelect2.val()) {
						return;
					}
					footer.hide();
					fieldsSelectDOM.closest('tr').hide();
					AppConnector.request({
						module: 'Home',
						view: 'MiniListWizard',
						step: 'step2',
						selectedModule: moduleNameSelect2.val()
					}).then(function (res) {
						filteridSelectDOM.empty().html(res).trigger('change');
						filteridSelect2.closest('tr').show();
					});
				});
				filteridSelect2.on('change', function () {
					if (!filteridSelect2.val()) {
						return;
					}
					AppConnector.request({
						module: 'Home',
						view: 'MiniListWizard',
						step: 'step3',
						selectedModule: moduleNameSelect2.val(),
						filterid: filteridSelect2.val()
					}).then(function (res) {
						const responseHTML = $(res);
						const fieldsHTML = responseHTML.find('select[name="fields"]').html();
						const filterFieldsHTML = responseHTML.find('select[name="filter_fields"]').html();
						fieldsSelectDOM.empty().html(fieldsHTML).trigger('change');
						fieldsSelect2.closest('tr').show();
						fieldsSelect2.data('select2').$selection.find('.select2-search__field').parent().css('width', '100%');
						filterFieldsSelectDOM.empty().html(filterFieldsHTML).trigger('change');
						filterFieldsSelect2.closest('tr').show();
						filterFieldsSelect2.data('select2').$selection.find('.select2-search__field').parent().css('width', '100%');
					});
				});
				fieldsSelect2.on('change', function () {
					if (!fieldsSelect2.val()) {
						footer.hide();
					} else {
						footer.show();
					}
				});

				form.on('submit', function (e) {
					e.preventDefault();
					var selectedModule = moduleNameSelect2.val();
					var selectedModuleLabel = moduleNameSelect2.find(':selected').text();
					var selectedFilterId = filteridSelect2.val();
					var selectedFilterLabel = filteridSelect2.find(':selected').text();
					var selectedFields = [];
					fieldsSelect2.select2('data').map(function (obj) {
						selectedFields.push(obj.id);
					});

					var data = {
						module: selectedModule
					};
					if (typeof selectedFields != 'object')
						selectedFields = [selectedFields];
					data['fields'] = selectedFields;
					thisInstance.saveMiniListWidget(data, element, selectedModuleLabel, selectedFilterId, selectedFilterLabel, form);
				});
			});
		});
	},
	saveMiniListWidget: function (data, element, moduleNameLabel, filterid, filterLabel, form) {
		var thisInstance = this;
		var paramsForm = {
			data: JSON.stringify(data),
			blockid: element.data('block-id'),
			linkid: element.data('linkid'),
			label: moduleNameLabel + ' - ' + filterLabel,
			title: form.find('[name="widgetTitle"]').val(),
			name: 'Mini List',
			filtersId: filterid,
			isdefault: 0,
			height: 4,
			width: 4,
			owners_all: ["mine", "all", "users", "groups"],
			default_owner: 'mine',
			dashboardId: thisInstance.getCurrentDashboard()
		};
		var sourceModule = $('[name="selectedModuleName"]').val();
		thisInstance.saveWidget(paramsForm, 'add', sourceModule, paramsForm.linkid).then(
			function (data) {
				var result = data['result'];
				var params = {};
				if (data['success']) {
					app.hideModalWindow();
					paramsForm['id'] = result['id'];
					paramsForm['status'] = result['status'];
					params['text'] = result['text'];
					params['type'] = 'success';
					var linkElement = element.clone();
					linkElement.data('name', 'MiniList');
					linkElement.data('id', result['wid']);
					Vtiger_DashBoard_Js.addWidget(linkElement, 'index.php?module=Home&view=ShowWidget&name=MiniList&linkid=' + element.data('linkid') + '&widgetid=' + result['wid'] + '&active=0');
					Vtiger_Helper_Js.showMessage(params);
				} else {
					var message = data['error']['message'];
					if (data['error']['code'] != 513) {
						var errorField = form.find('[name="fieldName"]');
					} else {
						var errorField = form.find('[name="fieldLabel"]');
					}
					errorField.validationEngine('showPrompt', message, 'error', 'topLeft', true);
				}
			}
		);
	},
	saveWidget: function (form, mode, sourceModule, linkid) {
		var aDeferred = $.Deferred();
		var progressIndicatorElement = $.progressIndicator({
			'position': 'html',
			'blockInfo': {
				'enabled': true
			}
		});
		if (typeof sourceModule === "undefined") {
			sourceModule = app.getModuleName();
		}
		var params = {
			form: form,
			module: app.getModuleName(),
			sourceModule: sourceModule,
			action: 'Widget',
			mode: mode,
			addToUser: true,
			linkid: linkid,
		};
		AppConnector.request(params).then(
			function (data) {
				progressIndicatorElement.progressIndicator({'mode': 'hide'});
				aDeferred.resolve(data);
			},
			function (error) {
				progressIndicatorElement.progressIndicator({'mode': 'hide'});
				aDeferred.reject(error);
			}
		);
		return aDeferred.promise();
	},
	registerTabModules: function () {
		var thisInstance = this;
		$('.selectDashboradView li').on('click', function (e) {
			var currentTarget = $(e.currentTarget);
			$('.selectDashboradView li').removeClass('active');
			currentTarget.addClass('active');
			var params = {
				module: currentTarget.data('module'),
				view: app.getViewName(),
				sourceModule: app.getModuleName(),
				dashboardId: thisInstance.getCurrentDashboard()
			};
			AppConnector.request(params).then(function (data) {
				$('.dashboardViewContainer').html(data);
				thisInstance.noCache = true;
				thisInstance.registerEvents();
			});
		});
	},
	/**
	 * Remove widget from list
	 */
	removeWidgetFromList: function () {
		const thisInstance = this;
		$('.dashboardHeading').on('click', '.removeWidgetFromList', function (e) {
			var currentTarget = $(e.currentTarget);
			var id = currentTarget.data('widget-id');
			var params = {
				module: app.getModuleName(),
				action: 'Widget',
				mode: 'removeWidgetFromList',
				widgetid: id
			};
			AppConnector.request(params).then(function (data) {
				var params = {
					text: app.vtranslate('JS_WIDGET_DELETED'),
					type: 'success',
				};
				Vtiger_Helper_Js.showMessage(params);
				var parent = currentTarget.closest('li');
				$(parent).remove();
				thisInstance.updateLazyWidget();
			});
		});
	},
	registerEvents: function () {
		this.registerGridster();
		this.registerRefreshWidget();
		this.removeWidget();
		this.registerDatePickerHideInitiater();
		this.gridsterStop();
		this.registerShowMailBody();
		this.registerChangeMailUser();
		this.registerMiniListWidget();
		this.registerChartFilterWidget();
		this.registerTabModules();
		this.removeWidgetFromList();
		this.registerSelectDashboard();
	}
});
