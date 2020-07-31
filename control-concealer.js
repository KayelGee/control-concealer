(async () => {
	//CONFIG.debug.hooks=true;
	class ControlConcealer {
		static async initialize(){

			const myVar = 'Example value to be passed to handlebars';
			const path = '/modules/control-concealer/templates';
			// Get the handlebars output
			const myHtml = await renderTemplate(`${path}/controlConcealerUI.html`, {myVar});

			document.getElementById("controls").insertAdjacentHTML('beforebegin', myHtml);

			let config_button=document.getElementById("control-concealer").getElementsByClassName("control-concealer-config")[0];
			let dev_button=document.getElementById("control-concealer").getElementsByClassName("control-concealer-dev")[0];
			let prod_button=document.getElementById("control-concealer").getElementsByClassName("control-concealer-prod")[0];

			$(config_button).click(()=>{ControlConcealer.changeEditMode()});
			$(dev_button).click(()=>{ 
				if(config_button.classList.contains('active')) return ui.notifications.error(game.i18n.localize("CONTROLCONCEALER.error.EditActive"));
				prod_button.classList.toggle("active", false);
				dev_button.classList.toggle("active", true);
				//SceneControlsHider.loadHiddenStatus();
				$(document).find(".scene-control.active").click();
			});
			$(prod_button).click(()=>{
				if(config_button.classList.contains('active')) return ui.notifications.error(game.i18n.localize("CONTROLCONCEALER.error.EditActive"));
				prod_button.classList.toggle("active", true);
				dev_button.classList.toggle("active", false);
				//SceneControlsHider.loadHiddenStatus();
				$(document).find(".scene-control.active").click();
			});

			if(!dev_button.classList.contains('active') && !prod_button.classList.contains('active')){
				prod_button.classList.toggle('active', true);
			}

			ControlConcealer.loadHiddenElements();
		}

		static changeEditMode(){
			let config_button=document.getElementById("control-concealer").getElementsByClassName("control-concealer-config")[0];
			if(config_button.classList.contains('active')){
				config_button.classList.toggle('active', false);
				ControlConcealer.endEditMode();
				
				ui.notifications.info(game.i18n.localize("CONTROLCONCEALER.info.EditModeEnd"));
			}else{
				config_button.classList.toggle('active', true);
				ControlConcealer.activateEditMode();
				
				ui.notifications.info(game.i18n.localize("CONTROLCONCEALER.info.EditModeActive"));
			}
		}

		static activateEditMode(){
			document.getElementById("controls").classList.toggle('hide-active', false);
			$('#controls').find('li').contextmenu(ControlConcealer.hideElement);
		} 

		static endEditMode(){
			ControlConcealer.saveHiddenElements();

			document.getElementById("controls").classList.toggle('hide-active', true);
			$('#controls').find('li').off('contextmenu', ControlConcealer.hideElement);
		}

		static saveHiddenElements(){
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

		static _renderSceneControls(control, html, data){
			ControlConcealer.loadHiddenElements();

			if(!document.getElementById('control-concealer')) return;

			let config_button=document.getElementById('control-concealer').getElementsByClassName("control-concealer-config")[0];
			if(config_button.classList.contains('active')){
				ControlConcealer.activateEditMode();
			}
		}

		static loadHiddenElements(){
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
						if(!ControlConcealer.compareControl(ctrl, index)) {
							hasControlMissmatch = true;
							const actualIndex = ControlConcealer.findControl(ctrl);
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
						if(!ControlConcealer.compareTool(tool, ctrl_index, tool_index)){
							hasControlMissmatch = true;
							const actualIndex = ControlConcealer.findTool(tool, ctrl_index);
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

		static findControl(target){
			return ui.controls.controls.findIndex(control => control.icon === target.icon && control.name === target.name && control.title === target.title);
		}

		static findTool(target, ctrl_index){
			return ui.controls.controls[ctrl_index].tools.findIndex(tool => tool.icon === target.icon && tool.name === target.name && tool.title === target.title);
		}

		static compareControl(source, index){
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

		static compareTool(source, control_index, tool_index){
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

		static hideElement(event){
			event.currentTarget.classList.toggle("control-concealer-hide");
			ControlConcealer.saveHiddenElements();
			return false;
		}
	}

	Hooks.on('canvasReady', () => ControlConcealer.initialize());
	Hooks.on('renderSceneControls', (control, html, data) => ControlConcealer._renderSceneControls(control, html, data));
})();
