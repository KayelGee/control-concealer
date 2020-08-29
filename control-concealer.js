(async () => {
	//CONFIG.debug.hooks=true;
	class ControlConcealer {
		constructor() {
			this.view = "prod";
			this.edit = false;
		}

		let
		async initialize(){
			this.loadHiddenElements();
		}

		async add_controls(html){
			const myVar = 'Example value to be passed to handlebars';
			const path = '/modules/control-concealer/templates';
			// Get the handlebars output
			const myHtml = await renderTemplate(`${path}/controlConcealerUI.html`, {myVar});

			html.prepend(myHtml);

			
			let config_button=html.find("#control-concealer .control-concealer-config");
			let dev_button=html.find("#control-concealer .control-concealer-dev");
			let prod_button=html.find("#control-concealer .control-concealer-prod");

			config_button.click(()=>{this.changeEditMode()});
			dev_button.click(()=>{ 
				if(this.edit) return ui.notifications.error(game.i18n.localize("CONTROLCONCEALER.error.EditActive"));
				this.view = "dev";
				//SceneControlsHider.loadHiddenStatus();
				$(document).find(".scene-control.active").click();
			});
			prod_button.click(()=>{
				if(config_button.hasClass('active')) return ui.notifications.error(game.i18n.localize("CONTROLCONCEALER.error.EditActive"));
				this.view = "prod";
				//SceneControlsHider.loadHiddenStatus();
				$(document).find(".scene-control.active").click();
			});

			if(this.view === "dev"){
				dev_button.toggleClass('active', true);
			}
			else{
				prod_button.toggleClass('active', true);
			}
			if(this.edit){
				config_button.toggleClass('active', true);
			}
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
			$('#controls').find('li').contextmenu(this.hideElement);
		} 

		endEditMode(){
			this.saveHiddenElements();

			document.getElementById("controls").classList.toggle('hide-active', true);
			$('#controls').find('li').off('contextmenu', this.hideElement);
		}

		saveHiddenElements(){
			let hiddencontrols = [];
			let hiddentools = [];
			let scenecontrols = document.getElementById("controls").getElementsByClassName("scene-control");
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
					const tools = scenecontrol.getElementsByClassName("control-tool");
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
			let dev_button=document.getElementById("control-concealer").getElementsByClassName("control-concealer-dev")[0];
			let savetab = "prod-tab";
			if(dev_button.classList.contains("active")) savetab = "dev-tab";
			
			game.user.setFlag('control-concealer', savetab, {hiddencontrols:hiddencontrols, hiddentools:hiddentools});
		}

		async _renderSceneControls(control, html, data){
			await this.add_controls(html);
			this.loadHiddenElements();

			if(!document.getElementById('control-concealer')) return;

			let config_button=document.getElementById('control-concealer').getElementsByClassName("control-concealer-config")[0];
			if(config_button.classList.contains('active')){
				this.activateEditMode();
			}
		}

		loadHiddenElements(){
			let savetab = "prod-tab";
			if(document.getElementById('control-concealer')){
				let dev_button=document.getElementById("control-concealer").getElementsByClassName("control-concealer-dev")[0];
				if(dev_button.classList.contains("active")) savetab = "dev-tab";
			}
			let tab= game.user.getFlag('control-concealer', savetab) || {};
			if(Object.keys(tab).length==0) return;

			let hiddencontrols = tab.hiddencontrols;
			let hiddentools = tab.hiddentools;

			let scenecontrols = document.getElementById("controls").getElementsByClassName("scene-control");
			//disable all hidden status
			for (let i = 0; i < scenecontrols.length; i++) {
				scenecontrols[i].classList.toggle("control-concealer-hide", false);;
				const tools = scenecontrols[i].getElementsByClassName("control-tool");
				for (let j = 0; j < tools.length; j++) {
					tools[j].classList.toggle("control-concealer-hide", false);;;
				}
			}

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
					scenecontrol.classList.toggle("control-concealer-hide", true);
				}
				else if(scenecontroltools){
					const scenetools = scenecontroltools.getElementsByClassName("control-tool");
					for (let j = 0; j < hiddencontroltools.tools.length; j++) {
						const hiddentool = hiddencontroltools.tools[j];
						const [scenetool] = getControlTool(hiddentool, scenetools, actualIndex, j);
						if(scenetool){
							scenetool.classList.toggle("control-concealer-hide", true);
						}
					}
				}
			}
			if(hasControlMissmatch){
				if(hasUnfixedControlMissmatch){
					ui.notifications.error(game.i18n.localize("CONTROLCONCEALER.error.ControlMissmatch"));
				}else{
					ui.notifications.warn(game.i18n.localize("CONTROLCONCEALER.warning.ControlMissmatchFixed"));
				}
			}
			document.getElementById("controls").classList.toggle('hide-active', true);
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

			event.currentTarget.classList.toggle("control-concealer-hide");
		hideElement = (event) =>{
			this.saveHiddenElements();
			return false;
		}
	}

	let controlConcealer = new ControlConcealer(); 
	Hooks.once('canvasReady', () => controlConcealer.initialize());
	Hooks.on('renderSceneControls', (control, html, data) => controlConcealer._renderSceneControls(control, html, data));
})();
