
const hideByDefault = false;

function MakeCollapsible(jsonData, root=true){
	var rootelem = document.createElement("div");
	if(root){
		rootelem.classList.add("tablemain");
	}
	Object.entries(jsonData).forEach(([key,val])=>{
		let te = document.createElement("div");
		te.className = "tableentry";
		let th = document.createElement("div");
		th.textContent = key+": ";
		th.className = "tablehead";
		
		let td;
		if(val!==null && "object"===(typeof(val))){
			td = MakeCollapsible(val, false);
			td.classList.toggle("hidden", hideByDefault);
			//td.style.display = "none";
			
			th.role = "button";
			th.tabIndex = 0;
			th.addEventListener("click",(event)=>{
			//	event.target.nextElementSibling.style.display = event.target.nextElementSibling.style.display === "none" ? "" : "none";
				event.target.nextElementSibling.classList.toggle("hidden");
			});
		}else{
			td = document.createElement("div");
			td.textContent = val;
			td.classList.add("primitive");
		}
		td.classList.add("tabledata");
		te.appendChild(th);
		te.appendChild(td);
		rootelem.appendChild(te);
	});
	return rootelem;
}
function MakeTable(jsonData, includeTotals = true, includeHeaders = true){
	var headers = [...new Set(jsonData.flatMap(a=>Object.keys(a)))];
	var table = document.createElement("table");
	var thead = document.createElement("thead");
	var tbody = document.createElement("tbody");
	var tfoot = document.createElement("tfoot");
	var thr = document.createElement("tr");
	var totals = {};
	
	headers.forEach(hname=>{
		if(includeHeaders){
			var th = document.createElement("th");
			th.textContent = hname.replaceAll(/(?=[A-Z])/g,"\u200B");
			thr.appendChild(th);
		}
		if(includeTotals){
			totals[hname] = 0;
		}
	});
	if(includeHeaders){
		thead.appendChild(thr);
	}
	
	jsonData.forEach((val,i)=>{
		var tdr = document.createElement("tr");
		headers.forEach(colname=>{
			var td = document.createElement("td");
			var val2 = val[colname];
			td.classList.add((typeof(val2)).toLowerCase());
			if(val2!==null && "object"===(typeof(val2))){
				if(Array.isArray(val2)){
					td.textContent = val2.join(", ");
				}
				else{
					td.textContent = JSON.stringify(val2).replaceAll(",",", ");
					if(val2.hasOwnProperty("X")){
						td.classList.add("Vector3");
					}
				}
			}else{
				td.textContent = val2;
			}
			if(includeTotals){
				totals[colname] += Boolean(val2);
			}
			tdr.appendChild(td);
		});
		tbody.appendChild(tdr);
	});
	if(includeTotals){
		var tfr = document.createElement("tr");
		tfr.title = "Totals";
		headers.forEach(hname=>{
			var td = document.createElement("td");
			td.textContent = totals[hname];
			tfr.appendChild(td);
		});
		tfoot.appendChild(tfr);
	}
	
	table.appendChild(thead);
	table.appendChild(tbody);
	table.appendChild(tfoot);
	return table;
}
function MakeTableWithCaption(caption, jsonData, includeTotals, includeHeaders){
	var t = MakeTable(jsonData, includeTotals, includeHeaders);
	var c = document.createElement("caption");
	c.textContent = caption;
	t.prepend(c);
	return t;
}
