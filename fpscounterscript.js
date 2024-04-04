var fpscountersetactive = null;
var fpscountergetactive = null;
var fpsconttopleftelemname;
document.addEventListener("DOMContentLoaded", ()=>{
	var lastfpstime = 0;
	var lasttimedifflog = [];
	var fpscounter = document.getElementById("fpscounter");
	var mindiff = 99999;
	var maxfps = 60;
	const fpscont = document.getElementById("fpscountercontainer");
	const fpschartelem = document.getElementById("fpschart");
	
	//true if using `file` protocol, or reduced motion off and not mobile and more than 8 logical processors
	var fpscounteractive = !(window.matchMedia("(prefers-reduced-motion)")?.matches??true)//reduced motion off
			&& (!navigator.userAgent.match(/Mobile/i) && navigator.hardwareConcurrency>=8)//and not mobile and more than 8 logical processors
			|| window.location.protocol.match(/^file/i);//if using `file` protocol
	
	function nextFrame(time){
		var timediff = time - lastfpstime;
		lastfpstime = time;
		if(timediff < mindiff){
			mindiff = timediff;
			maxfps = 1000/mindiff;//Math.min(...lasttimedifflog);
		}
		lasttimedifflog.push(timediff);
		var maxframes = Number(fpschartelem.dataset["maxlasttimediffloglen"]);
		while(lasttimedifflog.length > maxframes){
			lasttimedifflog.shift()
		}
		const fpschartwidth = Number(fpscont.getAttribute("width"));
		const fpschartheight = Number(fpscont.getAttribute("height"));
		var fpschartwidthmulti = fpschartwidth/maxframes;
		var fpschartheightmulti = Math.floor(fpschartheight/maxfps);
		var fpsavg = (1000/(lasttimedifflog.reduce((a,b)=>a+b)/lasttimedifflog.length)).toFixed(5);
		var chartavg = fpsavg*fpschartheightmulti;
		var xoffset = maxframes-lasttimedifflog.length;
		fpscounter.textContent = fpsavg + " fps avg (last "+lasttimedifflog.length+" frames)\n"
		                 + (1000/timediff).toFixed(5) + " fps";
		fpschartelem.setAttribute("d", "M"+Object.entries(lasttimedifflog).map(a=>((Number(a[0])+xoffset)*fpschartwidthmulti+","+(1000/a[1]*fpschartheightmulti).toFixed(3))).join(" "));
		document.getElementById("fpschartavg").setAttribute("d", "M 0,"+chartavg+"h"+fpschartwidth);
		
		if(fpsconttopleftelemname!=null){
			let fpsconttopleftelem = document.getElementById(fpsconttopleftelemname);
			if(fpsconttopleftelem){
				fpscont.style.top = window.getComputedStyle(fpsconttopleftelem).height;
				fpscont.style.left = window.getComputedStyle(fpsconttopleftelem).left;
			}
		}
		if(fpscounteractive){
			window.requestAnimationFrame(nextFrame);
		}
	}
	fpscountersetactive = function(active){
		if(!fpscounteractive && active){
			window.requestAnimationFrame(nextFrame);
		}
		fpscounteractive = active;
	}
	fpscountergetactive = function(){
		return fpscounteractive;
	}
	
	window.requestAnimationFrame(nextFrame);

});
