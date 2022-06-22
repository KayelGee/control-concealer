(async () => {
	//CONFIG.debug.hooks=true;
	class ControlConcealer {
		constructor() {
			this.view = "prod";
			this.edit = false;
		}

		async initialize(){
			await this.loadHiddenElements();
		}

		async add_controls(html){
			const myVar = 'Example value to be passed to handlebars';
			const path = '/modules/control-concealer/templates';
			// Get the handlebars output
			const myHtml = await renderTemplate(`${path}/controlConcealerUI.html`, {myVar});
			const main_controls = html.find(".main-controls");
			main_controls.prepend(myHtml);

			
			let config_button=html.find("#control-concealer .control-concealer-config");
			let dev_button=html.find("#control-concealer .control-concealer-dev");
			let prod_button=html.find("#control-concealer .control-concealer-prod");

			config_button.click(()=>{this.changeEditMode()});
			dev_button.click(()=>{ 
				if(this.edit) return ui.notifications.error(game.i18n.localize("CONTROLCONCEALER.error.EditActive"));
				this.view = "dev";
				$(document).find(".scene-control.active").click();
				this.updateButtons();
			});
			prod_button.click(()=>{
				if(config_button.hasClass('active')) return ui.notifications.error(game.i18n.localize("CONTROLCONCEALER.error.EditActive"));
				this.view = "prod";
				$(document).find(".scene-control.active").click();
				this.updateButtons();
			});

			this.updateButtons();
		}

		updateButtons(){
			let config_button=$(document).find("#control-concealer .control-concealer-config");
			let dev_button=$(document).find("#control-concealer .control-concealer-dev");
			let prod_button=$(document).find("#control-concealer .control-concealer-prod");

			dev_button.toggleClass('active', this.view === "dev");
			prod_button.toggleClass('active', this.view === "prod");
			config_button.toggleClass('active', this.edit);
			
			this.loadHiddenElements();
		}

		changeEditMode(){
			let config_button=document.getElementById("control-concealer").getElementsByClassName("control-concealer-config")[0];
			if(config_button.classList.contains('active')){
				this.edit=false;
				config_button.classList.toggle('active', false);
				this.endEditMode();
				
				ui.notifications.info(game.i18n.localize("CONTROLCONCEALER.info.EditModeEnd"));
			}else{
				this.edit=true;
				config_button.classList.toggle('active', true);
				this.activateEditMode();
				
				ui.notifications.info(game.i18n.localize("CONTROLCONCEALER.info.EditModeActive"));
			}
		}

		activateEditMode(){
			document.getElementById("controls").classList.toggle('hide-active', false);
			document.getElementById("sidebar").classList.toggle('hide-active', false);
			this.addSidebarOverlay();
			$('#controls').find('li').contextmenu(this.hideElement);
		} 

		addSidebarOverlay(){
			let overlayCol = $('<div class="item-overlay-col tabs"></div>');
			$('#sidebar-tabs').append(overlayCol);
			let add_overlay=(element) =>{
				let overlay_item = $('<div>&nbsp;</div>');
				overlay_item.addClass("item-overlay");
				overlay_item.attr('data-original-tab', $(element).data('tab'));
				overlayCol.append(overlay_item);
				overlay_item.contextmenu(this.hideSidebarElement);
			};
			$('#sidebar-tabs').find(".item").each((index, element)=>{
				add_overlay(element);
			});
			$('#sidebar-tabs').find(".collapse").each((index, element)=>{
				add_overlay(element);
			});
		}

		removeSidebarOverlay(){
			$('#sidebar-tabs').find(".item-overlay-col").remove();
		}

		endEditMode(){
			this.saveHiddenElements();

			document.getElementById("controls").classList.toggle('hide-active', true);
			document.getElementById("sidebar").classList.toggle('hide-active', true);
			this.removeSidebarOverlay();
			$('#controls').find('li').off('contextmenu', this.hideElement);
		}

		async saveHiddenElements(){
			let hiddencontrols = [];
			let hiddentools = [];
			let hiddentabs= [];
			
			let scenecontrols = document.getElementById("controls").getElementsByClassName("scene-control");
			let subcontrols = document.getElementById("controls").getElementsByClassName("sub-controls");

			let sidebartabs = document.getElementById("sidebar-tabs").getElementsByClassName("item");
			for (let i = 0; i < scenecontrols.length; i++) {
				const scenecontrol = scenecontrols[i];
				let hiddenscenecontrol = (() => {
						const control = ui.controls.controls[i];
						let data = {};
						for (const key in control) {
							if (key !== "activeTool" && key !== "tools" && key !== "onClick" &&  control.hasOwnProperty(key)) {
								data[key] = control[key];
							}
						}
						data.tools = [];
						return data;
					})();
				if(scenecontrol.classList.contains("control-concealer-hide")){
					hiddencontrols.push(hiddenscenecontrol);
					hiddentools.push({});
				}
				else{
					hiddencontrols.push({});
					const tools = subcontrols[i]?.getElementsByClassName("control-tool") ?? [];
					let toolshidden = false;
					for (let j = 0; j < tools.length; j++) {
						const tool = tools[j];
						if(tool.classList.contains("control-concealer-hide")){
							toolshidden = true;
							const hiddentool = (() => {
									const tool = ui.controls.controls[i].tools[j];
									let data = {};
									for (const key in tool) {
										if (key !== "activeTool" && key !== "tools" && key !== "onClick" &&  tool.hasOwnProperty(key)) {
											data[key] = tool[key];
										}
									}
									return data;
								})();
							hiddenscenecontrol.tools.push(hiddentool);
						}else{
							hiddenscenecontrol.tools.push({});
						}
					}
					if(toolshidden)	hiddentools.push(hiddenscenecontrol);
					else hiddentools.push({});
				}
			}

			for (let i = 0; i < sidebartabs.length; i++) {
				const tab = sidebartabs[i];
				if(tab.classList.contains("control-concealer-hide")){
					hiddentabs.push(tab.dataset.tab);
				}
			}

			let dev_button=document.getElementById("control-concealer").getElementsByClassName("control-concealer-dev")[0];
			let savetab = "prod-tab";
			if(dev_button.classList.contains("active")) savetab = "dev-tab";
			
			await game.user.setFlag('control-concealer', savetab, {hiddencontrols:hiddencontrols, hiddentools:hiddentools, hiddentabs:hiddentabs});
		}

		invert_element_color(element){
			let bg=window.getComputedStyle(element, null).getPropertyValue('background-color');
			let fg=window.getComputedStyle(element, null).getPropertyValue('color');
			element.dataset.originalColor = fg;
			element.dataset.originalBackgroundColor = bg;
			element.style.color = this.invert_color(fg);
			element.style.backgroundColor = this.invert_color(bg);
		}

		reset_element_color(element){
			if(element.dataset.originalColor) element.style.color = element.dataset.originalColor; 
			if(element.dataset.originalBackgroundColor) element.style.backgroundColor = element.dataset.originalBackgroundColor;
		}

		invert_color(color){
			let newcolor = color;
			if(color.startsWith("rgba")){
				newcolor = "rgba(";
				let colors = color.replace("rgba(", "");
				colors = colors.replace(")", "");
				colors = colors.split(", ");
				for (let i = 0; i < colors.length-1; i++) {
					colors[i] = (255 - parseInt(colors[i]));
				}
				newcolor += colors.join(", "); 
				newcolor += ")";
			}
			else if(color.startsWith("rgb")){
				newcolor = "rgb(";
				let colors = color.replace("rgb(", "");
				colors = colors.replace(")", "");
				colors = colors.split(", ");
				for (let i = 0; i < colors.length; i++) {
					colors[i] = (255 - parseInt(colors[i]));
				}
				newcolor += colors.join(", "); 
				newcolor += ")";			
			}
			return newcolor;
		}

		async _renderSceneControls(control, html, data){
			await this.add_controls(html);
			await this.loadHiddenElements();

			if(!document.getElementById('control-concealer')) return;

			let config_button=document.getElementById('control-concealer').getElementsByClassName("control-concealer-config")[0];
			if(config_button.classList.contains('active')){
				this.activateEditMode();
			}
		}

		async loadHiddenElements(){
			let savetab = "prod-tab";
			if(document.getElementById('control-concealer')){
				let dev_button=document.getElementById("control-concealer").getElementsByClassName("control-concealer-dev")[0];
				if(dev_button.classList.contains("active")) savetab = "dev-tab";
			}
			let tab= game.user.getFlag('control-concealer', savetab) || {};

			let scenecontrols = document.getElementById("controls").getElementsByClassName("scene-control");
			let subcontrols = document.getElementById("controls").getElementsByClassName("sub-controls");
			//disable all hidden status
			for (let i = 0; i < scenecontrols.length; i++) {
				this.toggle_hidden(scenecontrols[i], false);
				const tools = subcontrols[i]?.getElementsByClassName("control-tool") ?? [];
				for (let j = 0; j < tools.length; j++) {
					this.toggle_hidden(tools[j], false);
				}
			}
			let sidebartabs = document.getElementById("sidebar-tabs")?.getElementsByClassName("item") ?? [];
			for (let i = 0; i < sidebartabs.length; i++) {
				this.toggle_hidden(sidebartabs[i], false);
			}

			
			if(Object.keys(tab).length==0) return;

			let hiddencontrols = tab.hiddencontrols;
			let hiddentools = tab.hiddentools;
			let hiddentabs = tab.hiddentabs;

			let hasControlMissmatch = false;
			let hasUnfixedControlMissmatch = false;
			//enable hidden status for hidden elements
			for (let i = 0; i < hiddencontrols.length; i++) {
				const hiddencontrol = hiddencontrols[i];
				const hiddencontroltools = hiddentools[i];

				const getSceneControl = (ctrl, scenecontrols, index) => {
					if(Object.keys(ctrl).length > 0){
						if(!this.compareControl(ctrl, index)) {
							hasControlMissmatch = true;
							const actualIndex = this.findControl(ctrl);
							if(actualIndex == -1) {
								console.log("Control concealer | couldn't find: ", ctrl);
								hasUnfixedControlMissmatch = true;
							}
							else return [scenecontrols[actualIndex], actualIndex];
						}
						else{
							return [scenecontrols[index], index];
						}
					}
					return [];
				}
				const getControlTool = (tool, scenetools, ctrl_index, tool_index) => {
					if(Object.keys(tool).length > 0){
						if(!this.compareTool(tool, ctrl_index, tool_index)){
							hasControlMissmatch = true;
							const actualIndex = this.findTool(tool, ctrl_index);
							if(actualIndex == -1) {
								console.log("Control concealer | couldn't find: ", tool);
								hasUnfixedControlMissmatch = true;
							}
							else return [scenetools[actualIndex], actualIndex];
						} 
						else{
							return [scenetools[tool_index], tool_index];
						}
					}
					return [];
				};

				const [scenecontrol] = getSceneControl(hiddencontrol, scenecontrols, i);
				const [scenecontroltools, actualIndex] = getSceneControl(hiddencontroltools, scenecontrols, i);
				if(scenecontrol){
					this.toggle_hidden(scenecontrol, true);
				}
				else if(scenecontroltools){
					const scenetools = subcontrols[i].getElementsByClassName("control-tool");
					for (let j = 0; j < hiddencontroltools.tools.length; j++) {
						const hiddentool = hiddencontroltools.tools[j];
						const [scenetool] = getControlTool(hiddentool, scenetools, actualIndex, j);
						if(scenetool){
							this.toggle_hidden(scenetool, true);
						}
					}
				}
			}

			const sidebartabs_arr = Array.from(sidebartabs)
			for (let i = 0; i < hiddentabs.length; i++) {
				const htab = sidebartabs_arr.find(element => element.dataset.tab === hiddentabs[i]);
				if(htab){
					this.toggle_hidden(htab, true);
				}
				else{
					console.log("Control concealer | couldn't find sidebar tab: ", hiddentabs[i]);
					hasUnfixedControlMissmatch = true;
				}
			}

			if(hasControlMissmatch){
				if(hasUnfixedControlMissmatch){
					ui.notifications.error(game.i18n.localize("CONTROLCONCEALER.error.ControlMissmatch"));
				}else{
					ui.notifications.warn(game.i18n.localize("CONTROLCONCEALER.warning.ControlMissmatchFixed"));
					await this.saveHiddenElements();
				}
			}
			document.getElementById("controls").classList.toggle('hide-active', true);
			document.getElementById("sidebar").classList.toggle('hide-active', true);
		}

		findControl(target){
			return ui.controls.controls.findIndex(control => control.icon === target.icon && control.name === target.name && control.title === target.title);
		}

		findTool(target, ctrl_index){
			return ui.controls.controls[ctrl_index].tools.findIndex(tool => tool.icon === target.icon && tool.name === target.name && tool.title === target.title);
		}

		compareControl(source, index){
			if(ui.controls.controls.length <= index){
				return false;
			}
			const target = ui.controls.controls[index];
			for (const key in source) {
				if (key !== "activeTool" && key !== "tools" && key !== "onClick" && source.hasOwnProperty(key)){
					if(!target.hasOwnProperty(key) || source[key] !== target[key]){
						return false;
					}
				}
			}
			return true;
		}

		compareTool(source, control_index, tool_index){
			if(ui.controls.controls.length <= control_index){
				return false;
			}
			if(ui.controls.controls[control_index].tools.length <= tool_index){
				return false;
			}
			const target = ui.controls.controls[control_index].tools[tool_index];
			for (const key in source) {
				if (key !== "activeTool" && key !== "tools" && key !== "onClick" &&  source.hasOwnProperty(key)) {
					if(!target.hasOwnProperty(key) || source[key] !== target[key]){
						return false;
					}
				}
			}
			return true;
		}

		toggle_hidden(element, value){
			if(element.classList.contains("control-concealer-top")) return;
			if(element.classList.contains("control-concealer-tab")) return;
			if(element.id === "control-concealer") return;
			if(value === undefined){
				value = !element.classList.contains("control-concealer-hide");
			}
			element.classList.toggle("control-concealer-hide", value);
			if(value === true) this.invert_element_color(element);
			else this.reset_element_color(element);
		}

		hideElement = (event) =>{
			this.toggle_hidden(event.currentTarget);
			this.saveHiddenElements();
			return false;
		}

		hideSidebarElement = (event) =>{
			console.log("hide " + $(event.currentTarget).attr("data-original-tab"));
			let target = $(event.currentTarget).parent().parent().find(".item[data-tab='" + $(event.currentTarget).attr("data-original-tab") + "']");
			this.toggle_hidden(target[0]);
			//this.saveHiddenElements();
			return false;
		}
	}
	let controlConcealer = new ControlConcealer(); 
	Hooks.once('canvasReady', () => controlConcealer.initialize());
	Hooks.on('renderSceneControls', (control, html, data) => controlConcealer._renderSceneControls(control, html, data));
})();
