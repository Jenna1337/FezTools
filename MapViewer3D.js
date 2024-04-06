const MapViewer3D = function(maptree, worlddata, worldmap, mapcontainer){
	
	function yawPitchToRotVec(yaw, pitch, rads=false, anglefix=false){
		var radians_yaw;
		var radians_pitch;
		if(rads){
			radians_yaw = yaw
			radians_pitch = pitch
		}else{
			radians_yaw = yaw * (Math.PI / 180)
			radians_pitch = pitch * (Math.PI / 180)
		}
		if(anglefix){//idk if fixing the angles to be between 0 and a full circle actually does anything beneficial
			const FULL_CIRCLE_RADS = Math.PI*2;
			while(radians_yaw < 0){
				radians_yaw += FULL_CIRCLE_RADS;
			}
			while(radians_pitch < 0){
				radians_pitch += FULL_CIRCLE_RADS;
			}
			radians_yaw %= FULL_CIRCLE_RADS;
			radians_pitch %= FULL_CIRCLE_RADS;
		}
	//Calculate the cosine and sine values of half the yaw and pitch angles:
		var cos_yaw = Math.cos(radians_yaw / 2)
		var sin_yaw = Math.sin(radians_yaw / 2)
		var cos_pitch = Math.cos(radians_pitch / 2)
		var sin_pitch = Math.sin(radians_pitch / 2)
	//Compute the x, y, and z components of the axis vector:
		var x_axis = cos_yaw * sin_pitch
		var z_axis = sin_yaw * sin_pitch
		var y_axis = sin_yaw * cos_pitch
	//Compute the angle of rotation:
		var angle = 2 * Math.acos(cos_yaw * cos_pitch) * (180 / Math.PI)
		// Normalize the axis vector
		var magnitude = Math.sqrt(x_axis ** 2 + y_axis ** 2 + z_axis ** 2);
		var normalized_x_axis = x_axis / magnitude;
		var normalized_y_axis = y_axis / magnitude;
		var normalized_z_axis = z_axis / magnitude;
		
		return "rotate3d(" + normalized_x_axis + ", " + normalized_y_axis + ", " + normalized_z_axis + ", " + angle + "deg)";
	}
	
	const nodeSizeUnits = "px";
	const nodeDistanceMultiplier = 50;//determines the initial scale for everything
	var rootnodename = maptree[0].LevelName;
	const nodeOutlineSizeMultiplier = 2;
	const sharedLinkNodeContainer = true;
	const unscaleicons = true;
	const addhiddenicons = true;
	const dolinkoverlapcheck = true;
	
	var CurrentNode;
	var LastFocusedNode;
	var FocusNode;
	
	var maplinks;
	var mapnodepanbox;
	var mapnodes;
	var maplegend;
	var mapsettings;
	
	var mapdebuginfo = document.createElement("div");
	mapdebuginfo.id = "mapdebuginfo";
	mapcontainer.appendChild(mapdebuginfo);
	
	var nodeinfobox = document.createElement("div");
	nodeinfobox.id="nodeinfobox";
	mapcontainer.appendChild(nodeinfobox);
	
	var zoomMin = 0.01;
	var zoomMax = 100;
	
	var pitchMin = -90;
	var pitchMax = 0;
	
	var zoom = 0.5;
	var yaw = 45;
	var pitch = -45;
	
	function getDebugInfo(){
		return ({
				"zoom":zoom,
				"yaw":yaw,
				"pitch":pitch,
				"panX":Number(mapnodepanbox.dataset.tx),
				"panY":Number(mapnodepanbox.dataset.ty),
				"CurrentNode":CurrentNode.dataset.Name ?? (CurrentNode.Name ?? (CurrentNode.Title ?? CurrentNode.Alt))
		});
	}
	
	const mapicons = [
		{"Icon":"⛩️","Field":"HasWarpGate","Description":"HasWarpGate"},
		{"Icon":"🌀","Field":"HasLesserGate","Description":"HasLesserGate"},
		{"Icon":"🧰","Field":"ChestCount","Description":"Chest"},
		{"Icon":"🔒","Field":"LockedDoorCount","Description":"Locked doors"},//🔒
		{"Icon":"🟨","Field":"CubeShardCount","Description":"CubeShards / Golden cubes"},
		{"Icon":"🔸","Field":"SplitUpCount","Description":"SplitUpCubes / Cube bits"},
		
		{"Icon":"❓","Field":["OtherCollectibleCount", "ScriptIds", "SecretCount"],"Description":"Secrets and Anti cubes"},
		//{"Icon":"💀","Field":"OtherCollectibleCount","Description":"OtherCollectibles"},
		//{"Icon":"❓","Field":"ScriptIds","Description":"ScriptIds"},
		//{"Icon":"🟪","Field":"SecretCount","Description":"Secrets"},
		//{"Icon":"🚪","Field":"UnlockedDoorCount","Description":"Unlocked doors"},
	].map(a=>{a.Icon+="\uFE0F";return a;});
	
	var invertX = false;
	var invertY = true;
	var sensitivityX = 0.5;
	var sensitivityY = 0.5;
	var zoomSensitivity = 1.2;
	var fullcube = !navigator.userAgent.match(/Mobile/i);
	var LinkThickness = 0.05375;
	var showShortcutLinks = false;//worlddata.some(a=>a.Entrances?.some(b=>b.IsShortcut));
	
	var settings;
	
	var hidenodeinfoboxbutton = document.createElement("a");
	var hidenodeinfoboxbuttonspacer = document.createElement("span");
	{
		hidenodeinfoboxbuttonspacer.textContent = hidenodeinfoboxbutton.textContent = "X";//Note: not using Unicode Cross Mark character "\u274C\uFE0E" since some fonts might not support it.
		hidenodeinfoboxbutton.href = "#";
		hidenodeinfoboxbuttonspacer.className = hidenodeinfoboxbutton.className = "hidenodeinfoboxbuttoncontainer";
		hidenodeinfoboxbutton.id = "hidenodeinfoboxbutton";
		hidenodeinfoboxbutton.onclick = function(){
			nodeinfobox.classList.add("hidden");
		};
		hidenodeinfoboxbutton.ariaLabel = "Close Node Info";
		nodeinfobox.ariaLabel = "Node Info";
		hidenodeinfoboxbuttonspacer.role = "none";
		hidenodeinfoboxbuttonspacer.style.visibility = "hidden";
	}
	
	function focusOnNode(node){
		CurrentNode.classList.remove("selected");
		if(node !== LastFocusedNode){
			nodeinfobox.classList.remove("hidden");
		}
		LastFocusedNode = (FocusNode = (CurrentNode = node));
		CurrentNode.classList.add("selected");
		
		var ldat = JSON.parse(node.dataset.allLevelInfoData);
		
		if(dolinkoverlapcheck){
			document.querySelectorAll(".maplink.hidden").forEach(a=>a.classList.remove("hidden"));
		}
		//change colors of connected link lines
		document.querySelectorAll(".maplink.selected").forEach(a=>a.classList.remove("selected"));
		var linkinstances = ldat.Connections.flatMap(a=>a.LinkInstances);
		linkinstances.map(a=>document.querySelector(".maplink[data-linkindex=\""+a+"\"]")).forEach(l=>{
			if(dolinkoverlapcheck){
				let p = l.dataset.posindex;
				document.querySelectorAll(".maplink[data-posindex=\""+p+"\"]").forEach(d=>{
					if(d!==l && !d.classList.contains("selected") && !l.classList.contains("hidden")){
						d.classList.add("hidden");
					}
				});
			}
			l.classList.add("selected");
		});
		
		document.querySelectorAll(".maplink.mapshortcutlink").forEach(a=>{
			if(node.dataset.Name == a.dataset.node1 || node.dataset.Name == a.dataset.node2){
				a.classList.add("selected");
			}
		});
		
		//update rotations for billboard effect
		//mapnodescontainer.style.translate = node.style.translate.split(" ").map(a=>a.startsWith("-")?a.substring(1):"-"+a).join(" ")
		let loc = node.style.translate.split(/ |,/g).map(a=>a.startsWith("-")?a.substring(1):"-"+a);
		while(loc.length<3){
			loc.push("0px");
		}
		loc = loc.map((a,i)=>i<2?(Number(a.replace(nodeSizeUnits,""))-nodeDistanceMultiplier/2)+nodeSizeUnits:a);
		let loc2 = loc.map((a,i)=>i<2?(Number(a.replace(nodeSizeUnits,"")))+nodeSizeUnits:a);
		let scalestr = "scale("+zoom+") ";
		let translatestr = "translate3d("+loc.join(",")+") ";
		
		//yaw %= 360;
		//pitch %= 360;
		//while(yaw<0){ yaw+= 360; }
		//while(pitch<0){ pitch+= 360; }
		
		let rotatestr = yawPitchToRotVec(yaw,pitch);
		
		mapnodes.style.transform = scalestr + rotatestr + translatestr;
		
		maplinks.style = mapnodes.style.cssText;
		
		mapnodepanbox.style.translate = "0px 0px";
		mapnodepanbox.dataset.tx = 0;
		mapnodepanbox.dataset.ty = 0;
		//note: not using rotate3d causes janky stuff to occur
		const rot3dstr = rotatestr.replace(/(?=[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+(?:\.\d+))?deg)/i, "-");
		
		Array.from(mapnodes.children).forEach(a=>{
			if(a.className.includes("node")){
				let tempscale = a.style.scale;
				if(tempscale==null || tempscale.length<=0){
					tempscale = (a.dataset.Size ?? 1);
				}
				let scl3dstr = "scale("+tempscale+") ";
				let temppos = a.style.translate;
				a.style.removeProperty("scale");
				a.style.removeProperty("translate");
				a.style.transform = rot3dstr + scl3dstr;
				a.style.translate = temppos;
			}
		})
		let nodedata = Object.fromEntries(Object.keys(ldat)
				.filter(a=>!["Position","Texture","Size","NodeType","Connections","Entrances","BaseElement"].includes(a))
				.map(a=>{
					var rawdataentry = ldat[a];
					var parsedval = rawdataentry;
					//if(rawdataentry.toLowerCase()==="true"){
					//	parsedval = true;
					//}
					//else if(rawdataentry.toLowerCase()==="false"){
					//	parsedval = false;
					//}else if(!Number.isNaN(Number.parseFloat(rawdataentry))){
					//	parsedval = Number.parseFloat(rawdataentry);
					//}else if(rawdataentry.includes(",")){
					//	parsedval = rawdataentry.split(",");
					//}else{
					//	parsedval = rawdataentry;
					//}
					return [a,parsedval];
				}));
		nodeinfobox.innerHTML = "";
		nodeinfobox.appendChild(hidenodeinfoboxbutton);
		nodeinfobox.appendChild(hidenodeinfoboxbuttonspacer);
		nodeinfobox.appendChild(MakeCollapsible(nodedata));
		//nodeinfobox.textContent = JSON.stringify(nodedata,null," ");
		mapdebuginfo.textContent = JSON.stringify(getDebugInfo(),null," ");
	}
	
	var ShowRawLevelNameInsteadOfNodeImage = true;
	var LinksMesh;
	function Rebuild3DMap(){
		LinksMesh = worldmap.LinksMesh;
		mapnodepanbox = document.getElementById("mapnodepanbox") ?? document.createElement("div");
		mapnodepanbox.id = "mapnodepanbox";
		mapnodepanbox.innerHTML = "";
		
		maplinks = document.getElementById("maplinks") ?? document.createElement("div");
		maplinks.id = "maplinks";
		maplinks.innerHTML = "";
		{
			let tfstrs = [];//for hiding duplicate overlapping links 
			//generates link mesh from matricies
			LinksMesh[0].Instances.forEach((linkmatrix,linkindex)=>{
				var le = worldmap.LinksMesh[0].BaseElement.cloneNode(true);
				/*
				LinkInstances: probably something like this; note the second and last rows are only ever constants in the game's code.
				new Matrix(
					Center.X, Center.Y, Center.Z, 0f,
					Color.R, Color.G, Color.B, Color.Opacity,
					Scale.X, Scale.Y, Scale.Z, 0f,
					ActorSettings.InvisibleSides.Contains(FaceOrientation.Front) ? 1 : 0, ActorSettings.InvisibleSides.Contains(FaceOrientation.Right) ? 1 : 0, ActorSettings.InvisibleSides.Contains(FaceOrientation.Back) ? 1 : 0, ActorSettings.InvisibleSides.Contains(FaceOrientation.Left) ? 1 : 0);
				
				new Matrix(
					Center.X, Center.Y, Center.Z, 0f,
					1f, 1f, 1f, 1f,
					Scale.X, Scale.Y, Scale.Z, 0f,
					0f, 0f, 0f, 0f);
				
				
				CSS:
				matrix3d(Scale.X, 0, 0, 0,
						0, Scale.Y, 0, 0,
						0, 0, Scale.Z, 0,
						Center.X, Center.Y, Center.Z, 1);
				
				*/
				function matrixToCssMatrix3DString(m){
					const locscale=nodeDistanceMultiplier;
					var sX = m.M31;
					var sY = m.M32;
					var sZ = m.M33;
					var pX = m.M11 * locscale;
					var pY = m.M12 * locscale;
					var pZ = m.M13 * locscale;
					return "matrix3d("+
							sX + ", 0, 0, 0,"
							+"0, "+sY+", 0, 0,"
							+"0, 0, "+sZ+", 0,"
							+pX+", "+(-pY)+", "+pZ+", 1"
							+")";
				}
				var tfstr = matrixToCssMatrix3DString(linkmatrix);
				if(!tfstrs.includes(tfstr)){
					tfstrs.push(tfstr);
				}
				le.dataset.posindex = tfstrs.indexOf(tfstr);
				le.dataset.linkindex = linkindex;
				le.style.transform = tfstr;
				le.role = "presentation";
				maplinks.appendChild(le);
			});
			mapnodepanbox.appendChild(maplinks);
		}
		
		if(sharedLinkNodeContainer){
			mapnodes = maplinks;
		}else{
			mapnodes = document.createElement("div");
			maplinks.role = "presentation";
		}
		mapnodes.id = "mapnodes";
		worlddata.forEach(levelinfo=>{
			if(!levelinfo.Position){
				return;
			}
			var nodebox = document.createElement("div");
			nodebox.classList.add("nodebox");
			var mapnode = document.createElement(ShowRawLevelNameInsteadOfNodeImage ? "span" : "img");
			if(ShowRawLevelNameInsteadOfNodeImage){
				mapnode.textContent = levelinfo.Name;
			}
			mapnode.classList.add("mapnode");
			
			//Note: error event does not bubble, so we can't just use a single event listener
			mapnode.addEventListener("error", function(err){
				var targ = err.target;
				var targparent = targ.parentElement;
				var noimg = document.createElement("span");
				Array.from(targ.attributes).forEach(a=>{
					noimg.setAttribute(a.name, targ.getAttribute(a.name));
				});
				noimg.textContent = targ.alt;
				targ.style.display = "none";
				targ.remove();
				targparent.prepend(noimg);
			});
			let cachedImage = localStorage?.getItem(levelinfo.Texture);
			if(cachedImage!=null){
				mapnode.src = cachedImage;
			}else{
				mapnode.src = levelinfo.Texture;
				if(window.isSecureContext && location.protocol!=="file:"){
					mapnode.addEventListener("load", function(evt){
						var imageElement = evt.target;
						var canvas = document.createElement('canvas');
						var ctx = canvas.getContext('2d');
						canvas.width = imageElement.naturalWidth;
						canvas.height = imageElement.naturalHeight;
						ctx.drawImage(imageElement, 0, 0);
						let dataurl = canvas.toDataURL();
						localStorage.setItem(levelinfo.Texture, dataurl);
					});
				}
			}
			mapnode.setAttribute('draggable', false)
			//mapnode.textContent = levelinfo.Name;//JSON.stringify(levelinfo);
			mapnode.title = mapnode.alt = levelinfo.Name;//JSON.stringify(levelinfo);
			Object.entries(levelinfo).forEach(ldat=>{
				if(!["Position","Connections","Entrances","BaseElement"].includes(ldat[0])){
					//mostly for quick searching and stuff //TODO add searching
					if((typeof ldat[1]) == (typeof ({}))){
						for(let p in ldat[1]){
							if((typeof ldat[1][p]) != (typeof function(){})){
								nodebox.dataset[ldat[0]+"---"+p] = ldat[1][p];
							}
						}
					}
					else{
						nodebox.dataset[ldat[0]] = ldat[1];
					}
				}
			});
			nodebox.dataset.allLevelInfoData = JSON.stringify(levelinfo);
			
			nodebox.height = mapnode.width = mapnode.style.height = mapnode.style.width = (1*nodeDistanceMultiplier+nodeSizeUnits);
			nodebox.style.scale = levelinfo.Size;
			let xpos = levelinfo.Position.X*nodeDistanceMultiplier +nodeSizeUnits;
			let ypos = -levelinfo.Position.Y*nodeDistanceMultiplier+nodeSizeUnits;
			let zpos = levelinfo.Position.Z*nodeDistanceMultiplier +nodeSizeUnits;
			nodebox.style.translate = xpos + " " + ypos + " " + zpos;
			//nodebox.style.fontSize = nodeDistanceMultiplier*0.3+nodeSizeUnits;//nodeDistanceMultiplier*0.04+nodeSizeUnits;
			//mapnode.style.outlineWidth = 1/levelinfo.Size*nodeDistanceMultiplier*0.3+nodeSizeUnits
			nodebox.style.setProperty("--outlinesize", nodeOutlineSizeMultiplier/levelinfo.Size*nodeDistanceMultiplier*0.05+nodeSizeUnits);
			nodebox.style.setProperty("--outlinesize-hover", nodeOutlineSizeMultiplier/levelinfo.Size*nodeDistanceMultiplier*0.25+nodeSizeUnits);
			nodebox.tabIndex = 0;
			nodebox.role = "button";
			nodebox.addEventListener("focusin", function(event){
				focusOnNode(this);
				nodeinfobox.classList.remove("hidden");
			}, true);
			nodebox.appendChild(mapnode);
			
			//add icons
			let mapnodeiconcontainer = document.createElement("div");
			mapnodeiconcontainer.className = "mapnodeiconcontainer";
			mapnodeiconcontainer.style.height = nodebox.height;
			if(unscaleicons){
				mapnodeiconcontainer.style.scale = 1/levelinfo.Size;
				mapnodeiconcontainer.style.height = nodeDistanceMultiplier*levelinfo.Size+nodeSizeUnits;
			}
			mapicons.map(a=>{
				function getFval(_fval){
					if(Array.isArray(_fval)){
						_fval = _fval.length;
					}
					return _fval;
				}
				function getFvalFromFieldName(fname){
					return getFval(levelinfo.Conditions[fname]) ?? getFval(levelinfo[fname]);
				}
				var fval;
				if(Array.isArray(a.Field)){ 
					fval = a.Field.map(f=>getFvalFromFieldName(f)).reduce((a,b)=>a+b,0);
				}
				else{
					fval = getFvalFromFieldName(a.Field);
				}
				return Object.assign({}, a, {"ShowFlag":Boolean(fval)});
			}).forEach(a=>{
				if(addhiddenicons || a.ShowFlag){
				//if(!(addhiddenicons && a.ShowFlag)){
					let nodeicon = document.createElement("span");
					nodeicon.className = "nodeicon";
					nodeicon.style.display = a.ShowFlag ? "" : "none";
					nodeicon.dataset.IconField = a.Field;
					nodeicon.textContent = a.Icon;
					nodeicon.title = a.Description;
					mapnodeiconcontainer.appendChild(nodeicon);
				}
			});
			nodebox.appendChild(mapnodeiconcontainer);
			
			mapnodes.appendChild(nodebox);
			
			if(nodebox.dataset.Name===rootnodename){
				LastFocusedNode = (FocusNode = (CurrentNode = nodebox));
			}
		});
		mapnodepanbox.appendChild(mapnodes);
		mapcontainer.appendChild(mapnodepanbox);
		
		//add shortcut links
		{
			//generates the transform for diagonal lines from one point in 3D space to another point, having the same thickness as LinkThickness
			function createTransformString(node1Pos, node2Pos) {
				if(node1Pos.Y < node2Pos.Y){
					let tmp = node1Pos;
					node1Pos = node2Pos;
					node2Pos = tmp;
				}
				const midpoint = {
					X: (node1Pos.X + node2Pos.X) / 2 * nodeDistanceMultiplier,
					Y: (node1Pos.Y + node2Pos.Y) / 2 * nodeDistanceMultiplier,
					Z: (node1Pos.Z + node2Pos.Z) / 2 * nodeDistanceMultiplier
				};
				const vector = {
					X: nodeDistanceMultiplier*(node2Pos.X - node1Pos.X),
					Y: nodeDistanceMultiplier*(node2Pos.Y - node1Pos.Y),
					Z: nodeDistanceMultiplier*(node2Pos.Z - node1Pos.Z)
				};
				const distance = Math.sqrt(
						(vector.X) ** 2 + 
						(vector.Y) ** 2 + 
						(vector.Z) ** 2);
				
				const distanceflat = Math.sqrt(
						(vector.X) ** 2 + 
						(vector.Z) ** 2);
				
				
				var azimuth = Math.PI/2 - Math.atan2(vector.Z, vector.X); if(Number.isNaN(azimuth)) azimuth = 0;
				var elevate = Math.atan(vector.Y/ distanceflat);
				
				const translateX = midpoint.X + nodeDistanceMultiplier / 2;
				const translateY = -midpoint.Y + nodeDistanceMultiplier / 2;
				const translateZ = midpoint.Z;
				
				const scaleX = LinkThickness;
				const scaleY = LinkThickness;
				const scaleZ = distance / nodeDistanceMultiplier;
				
				// I don't like trigonometry
				return [""
						//+ yawPitchToRotVec(azimuth, elevate, true)//Note: this doesn't work here for whatever reason
						+ " rotateY("+azimuth+"rad) rotateX("+elevate+"rad) "
						+ " scale3d("+scaleX+", "+scaleY+", "+scaleZ+") "
						,translateX+"px "+translateY+"px "+translateZ+"px",
						azimuth * 180/Math.PI, elevate * 180/Math.PI];
			}
			let shortcutConnections = worlddata.flatMap(a=>a.Entrances?.filter(b=>b.IsShortcut)).filter(a=>a!=null).map(a=>[a.LevelName,a.TargetLevelName]);
			//remove duplicate connections 
			shortcutConnections = shortcutConnections.reduce((a,c)=>{
				if(!(a.some(b=>c[1]==b[0] && c[0]==b[1]) || a.some(b=>c[0]==b[0] && c[1]==b[1]))){
					a.push(c);
				}return a;
			},[])
			//get node positions
			shortcutConnections = shortcutConnections.map(a=>a.map(b=>worldmap.NodesMesh.find(c=>c.CustomData.LevelName==b)));
			let shortcutTransforms = shortcutConnections.forEach(a=>{
				var m = createTransformString(a[0].Position,a[1].Position);
				var le = worldmap.LinksMesh[0].BaseElement.cloneNode(true);
				le.className = "maplink mapshortcutlink";
				le.style.transform = m[0];
				le.style.translate = m[1];
				//le.style.height = "0";
				//le.style.width = "0";
				le.style.transformOrigin = "top left";
				le.role = "presentation";
				le.dataset.node1 = a[0].CustomData.LevelName;
				le.dataset.node2 = a[1].CustomData.LevelName;
				le.title = '"'+le.dataset.node1 +"\" to \""+le.dataset.node2 + '"';
				if(!showShortcutLinks){
					le.style.display = "none";
				}
				maplinks.appendChild(le);
			});
			console.log(document.querySelectorAll(".mapshortcutlink"));
			//shortcutConnections.map(a=>a.map(b=>worldmap.NodesMesh.find(c=>c.CustomData.LevelName==b).Position))
			//shortcutConnections.map(a=>a.map(b=>JSON.parse(mapnodes.querySelector("[data--name=\""+b+"\"]").dataset.allLevelInfoData).Position))
			//JSON.stringify(shortcutConnections.map(a=>a.map(b=>worldmap.NodesMesh.find(c=>c.CustomData.LevelName==b).Position))) === JSON.stringify(shortcutConnections.map(a=>a.map(b=>JSON.parse(mapnodes.querySelector("[data--name=\""+b+"\"]").dataset.allLevelInfoData).Position)))
			
		}
		
		focusOnNode(CurrentNode);
	}
	
	maplegend = document.createElement("div");
	maplegend.id = "maplegend";
	maplegend.appendChild(MakeTableWithCaption("Legend", mapicons.map(a=>{a=Object.assign({},a);delete a.Field;return a;}), false, false));
	
	if(!navigator.userAgent.match(/Mobile/i)//not mobile
			&& (window.matchMedia("(update:fast)")?.matches??true)//and has fast updates
			){
		mapcontainer.classList.add("animations");
	}
	mapcontainer.appendChild(maplegend);
	
	//TODO add convenient zoom slider
	
	//events
	{
		let mousepos = {"X":0,"Y":0};
		mapcontainer.addEventListener("pointerdown",function(event){
			mousepos.X = event.pageX;
			mousepos.Y = event.pageY;
		});
		mapcontainer.addEventListener("pointermove",function(event){
			if(event.target!==nodeinfobox){
				var dx = event.pageX - mousepos.X;
				var dy = event.pageY - mousepos.Y;
				mousepos.X = event.pageX;
				mousepos.Y = event.pageY;
				event.preventDefault();//disables touch scrolling
				var b = event.buttons;
				mapcontainer.classList.toggle("nomousebuttons", !b);
				if((b&(swapPanRotate ? 2 : 1))>0){//mouse1
					let x = mapnodepanbox.dataset.tx = Number(mapnodepanbox.dataset.tx ?? 0) + dx;
					let y = mapnodepanbox.dataset.ty = Number(mapnodepanbox.dataset.ty ?? 0) + dy;
					mapnodepanbox.style.translate = x+"px "+y+"px";
				}
				if((b&(swapPanRotate ? 1 : 2))>0){//mouse2
					yaw += dx * (invertX ? -1 : 1) * sensitivityX;
					pitch += dy * (invertY ? -1 : 1) * sensitivityY;
					//yaw %= 360;
					pitch = Math.max(Math.min(pitch, pitchMax), pitchMin);
					
					focusOnNode(CurrentNode);
				}
			}
			mapdebuginfo.textContent = JSON.stringify(getDebugInfo(),null," ");
		});
		mapcontainer.addEventListener("contextmenu",function(event){
			if(event.target!==nodeinfobox){
				event.preventDefault();
				event.stopPropagation();
				return false;
			}
		});
		mapcontainer.addEventListener("wheel", function(event){
			if(event.target!==nodeinfobox){
				if(event.deltaY>0){
					zoom /= zoomSensitivity;
				}
				if(event.deltaY<0){
					zoom *= zoomSensitivity;
				}
				zoom = Math.max(Math.min(zoom, zoomMax), zoomMin);
				focusOnNode(CurrentNode);
			}
		})
		
		//TODO add keyboard controls
	}
	
	function RebuildWorldMap(){
		let a=GetAllWorldData(maptree,LinkThickness,fullcube);
		worldmap = a.worldmap;
		allworlddata = a.allworlddata;
		Rebuild3DMap();
		settings.showIcons = settings.showIcons;
	}
	
	var showIcons = true;
	var swapPanRotate = false;
	var initialized = false;
	var settings={
		get swapPanRotate(){
			return swapPanRotate;
		},
		set swapPanRotate(value){
			swapPanRotate = value;
			let s = document.getElementById("panrotationtogglebutton");
			if(s){
				s.dataset.option = value ? "rotate-pan" : "pan-rotate";
				s.title = "Swap "+(value ? "Rotate/Pan" : "Pan/Rotate")
			}
		},
		get showIcons(){
			return showIcons;
		},
		set showIcons(value){
			showIcons = value;
			mapcontainer.querySelectorAll(".mapnodeiconcontainer")
					.forEach(c=>c.style.display = showIcons ? "" : "none");
			mapcontainer.querySelector("#maplegend").style.display = showIcons ? "" : "none";
		},
		get invertX(){
			return invertX;
		},
		set invertX(value){
			invertX = value;
		},
		get invertY(){
			return invertY;
		},
		set invertY(value){
			invertY = value;
		},
		get sensitivityX(){
			return sensitivityX;
		},
		set sensitivityX(value){
			sensitivityX = value;
		},
		get sensitivityY(){
			return sensitivityY;
		},
		set sensitivityY(value){
			sensitivityY = value;
		},
		get zoomSensitivity(){
			return zoomSensitivity;
		},
		set zoomSensitivity(value){
			zoomSensitivity = value;
		},
		"RebuildWorldMap": RebuildWorldMap,
		get LinkThickness(){
			return LinkThickness;
		},
		set LinkThickness(value){
			LinkThickness = value;
			if(initialized){
				RebuildWorldMap();
			}
		},
		get ShowMapScreenImage(){
			return ShowRawLevelNameInsteadOfNodeImage;
		},
		set ShowMapScreenImage(value){
			ShowRawLevelNameInsteadOfNodeImage = !value;
			if(initialized){
				RebuildWorldMap();
			}
		},
		get RenderFullLinks(){
			return fullcube;
		},
		set RenderFullLinks(value){
			fullcube = value;
			if(initialized){
				RebuildWorldMap();
			}
		},
		get EnableCSSAnimations(){
			return mapcontainer.classList.contains("animations");
		},
		set EnableCSSAnimations(value){
			mapcontainer.classList.toggle("animations", value);
		},
		get ShowDebugInfo(){
			return mapdebuginfo.style.display!=="none";
		},
		set ShowDebugInfo(value){
			mapdebuginfo.style.display = value ? "" : "none";
			let fpstracker = document.getElementById("fpscountercontainer");
			if(fpstracker){
				fpstracker.style.display = value ? "" : "none";
				function waitForFpsToShow(){
					if(fpscountersetactive){
						fpscountersetactive(value);
					}else{
						window.requestAnimationFrame(waitForFpsToShow);
					}
				}
				window.requestAnimationFrame(waitForFpsToShow);
			}
		},
		get showShortcutLinks(){
			return showShortcutLinks;
		},
		set showShortcutLinks(value){
			showShortcutLinks = value;
			Array.from(document.querySelectorAll(".mapshortcutlink")).forEach(a=>a.style.display = showShortcutLinks ? "" : "none");
		},
		get ShortcutLinkHue(){
			return Number(mapcontainer.style.getPropertyValue("--shortcutlinkhue"));
		},
		set ShortcutLinkHue(value){
			mapcontainer.style.setProperty("--shortcutlinkhue", value*100 + "deg");
		},
		"CollapseSettings": function(evt){
			let targ = evt.target;
			let collapsed = targ.dataset.ischecked != "1";
			targ.dataset.ischecked = collapsed ? "1" : "0";
			if(collapsed){
				let parentStyle = window.getComputedStyle(targ.parentElement);
				let edgespacing = "0";
				targ.style.position = "absolute";
				targ.style.top = edgespacing;
				targ.style.left = edgespacing;
				targ.style.bottom = edgespacing;
				targ.style.right = edgespacing;
				
				targ.style.height = "100%";
				targ.style.width = "100%";
				
				targ.style.padding = "1px";
				targ.style.margin = "0px";
				
				targ.style.borderRadius = "0";
				
				targ.style.fontSize = "3ex";
				if(CSS.supports("font-size: 1.5lh"))
					targ.style.fontSize = "1.5lh";
				if(CSS.supports("font-size: calc(1lh + 1ex)"))
					targ.style.fontSize = "calc(1lh + 1ex)";
				
				targ.style.lineHeight = "1";
				if(CSS.supports("line-height: 1lh"))
					targ.style.lineHeight = "1lh";
				
				if(targ.value.length > 5){
					targ.dataset.value = targ.value;
				}
				targ.value = "⚙\uFE0E";
			}
			else{
				targ.style = "";
				targ.value = targ.dataset.value;
			}
			mapsettings.classList.toggle("collapsed", collapsed);
		}
	};
	
	mapsettings = document.createElement("div");
	mapsettings.id = "mapsettings";
	mapsettings.textContent = "Settings";
	mapsettings.appendChild(document.createElement("hr"));
	//generate map settings box
	{
		function iterateAllInputs(elem, callback){
			Array.from(elem.querySelectorAll("input")).forEach(callback);
		}
		function getInputState(i){
			let val = null;
			if(i.type=="checkbox"){
				val = i.checked;
			}
			else if(i.type=="number" || i.type=="range"){
				val = Number(i.value);
			}
			else if(i.type=="button"){
				val = null;
			}
			else{
				throw "Unsupported setting type:"+i.type;
				val = i.value;
			}
			return val;
		}
		function saveAllSettings(settingsbox){
			iterateAllInputs(settingsbox, settinginput => {
				let val = getInputState(settinginput);
				if(val!=null){
					localStorage.setItem(settinginput.id, val);
				}
			});
		}
		
		var s=Object.entries(settings).map(a=>({"key":a[0],"type":(typeof a[1]),"initValue":a[1]}))
		s.forEach(settingdata=>{
			let l = document.createElement("label");
			l.textContent = settingdata.key + ": ";
			let inputid = "map_setting_"+settingdata.key;
			l.setAttribute("for",inputid);
			let i = document.createElement("input");
			i.id = inputid;
			let noval = false;
			if(settingdata.type==typeof(true)){
				i.type = "checkbox";
				i.checked = settingdata.initValue;
			}
			else if(settingdata.type==typeof(69)){
				i.type = "range";
				i.type = "number";
				i.max = 5;
				i.min = 0;
				i.step = 0.01;
				i.value = settingdata.initValue;
				
				if(settingdata.key === "zoomSensitivity"){
					i.min = 1;
				}
			}
			else if(settingdata.type==typeof(function(){})){
				i.type = "button";
				i.value = settingdata.key;
				i.onclick = settings[settingdata.key];
			}
			else{
				throw "Unsupported setting type:"+settingdata.type;
				i.type = "text";
				i.value = settingdata.initValue;
				noval = true;
			}
			if(!noval){
				i.addEventListener("change", ()=>{
					let newval = getInputState(i);
					if(newval!=null){
						settings[settingdata.key] = newval;
					}
					saveAllSettings(mapsettings);
				});
			}
			
			let savedval = localStorage.getItem(i.id);
			if(savedval==null){
				savedval = settingdata.initValue;
			}
			let newval = null;
			if(i.type=="checkbox"){
				i.checked = newval=(savedval!=="false" && savedval!==false);
			}
			else if(i.type=="number" || i.type=="range"){
				i.value = newval=Number(savedval);
			}
			else if(i.type=="button"){
			}
			else{
				throw "Unsupported setting type:"+i.type;
				i.value = newval=savedval;
			}
			if(newval!=null){
				settings[settingdata.key] = newval;
			}
			
			
			mapsettings.appendChild(l);
			mapsettings.appendChild(i);
			mapsettings.appendChild(document.createElement("br"));
		});
	}
	mapcontainer.appendChild(mapsettings);
	
	mapsettings.addEventListener("pointermove",(event)=>{
		event.stopPropagation();
	});
	nodeinfobox.addEventListener("pointermove",(event)=>{
		event.stopPropagation();
	});
	mapsettings.addEventListener("wheel",(event)=>{
		event.stopPropagation();
	});
	nodeinfobox.addEventListener("wheel",(event)=>{
		event.stopPropagation();
	});
	mapsettings.addEventListener("contextmenu",(event)=>{
		event.stopPropagation();
	});
	nodeinfobox.addEventListener("contextmenu",(event)=>{
		event.stopPropagation();
	});
	
	//hide/collapse stuff if on mobile or if the screen is small
	if(navigator.userAgent.match(/Mobile/i) || !window.matchMedia("(min-width: 1000px)").matches){
		nodeinfobox.classList.add("hidden");
		
		//collapse settings
		Array.from(mapsettings.children).find(a=>a.id.toLowerCase().includes("collapse")).click();
		
	}
	
	initialized = true;
	RebuildWorldMap();
	
	return settings;
};
