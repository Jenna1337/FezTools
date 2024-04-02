'use strict';

HTMLCollection.prototype.forEach = Array.prototype.forEach;
HTMLCollection.prototype.map = Array.prototype.map;
HTMLCollection.prototype.filter = Array.prototype.filter;

var menubars = {
	menubarsactive0: false,
	get active(){
		return this.menubarsactive0;
	},
	set active(x){
		document.getElementsByClassName("menubar").forEach(a=>a.style.pointerEvents=(x?"":"none"))
		return this.menubarsactive0=x;
	}
}
const initMenubars = (function(){
var shortcutkeys={};
var accesskeys={
	nodekeys:[],
	map:{},
};
var activepointerid = -1;
document.addEventListener('onpointerdown', (e)=>{
	if(activepointerid>0 && e.pointerId!=activepointerid)
		return false;
	activepointerid = e.pointerId;
});
document.addEventListener('onpointerup', (e)=>{
	if(e.pointerId!=activepointerid)
		return false;
	activepointerid = -1;
});
document.addEventListener('pointermove', (e)=>{
	if(e.pointerId!=activepointerid)
		return false;
});

function addShortcutKey(key, fun){
	key=key.toLowerCase()
	if(!shortcutkeys[key]){
		shortcutkeys[key]=[];
	}
	shortcutkeys[key].push(fun);
}
function addAccessKey(node, key, cat, fun){
	key=key.toLowerCase()
	if(!accesskeys.map[key]){
		accesskeys.map[key]={};
	}
	if(!accesskeys.map[key][cat]){
		accesskeys.map[key][cat]=[];
	}
	node.accesskeylistid=accesskeys.nodekeys.length;
	accesskeys.nodekeys[node.accesskeylistid]=key;
	accesskeys.map[key][cat].push({elem:node,fn:fun});
}
function getsubmenulist(node){
	return node.menubar.submenus ? node.menubar.submenus : (
		node.menubar.submenus = node.menubar.children.map(e=>
			Array.prototype.filter.call(e.children, f=>
				f.classList.contains('menubarmenu')
			)[0]
		)
	);
}
function getsubmenu(node){
	while(!node.classList.contains('menubarmenu'))
		node = node.parentElement;
	return node;
}
function setattribute(elem, aname, aval){
	var a=getattribute(elem, aname);
	if(a==undefined || a==null)
		elem.attributes.setNamedItem(document.createAttribute(aname));
	elem.attributes[aname].value = aval;
}
function setselected(elem, aval){
	setattribute(elem, 'selected', aval);
	setactiveaccesskey(elem, aval, true);
}
function getselected(elem){
	var attr=getattribute(elem, 'selected');
	return attr ? ((''+attr).toLowerCase()=='true') : false;
}
function getattribute(elem, aname){
	return elem.attributes.getNamedItem(aname);
}
function setactiveaccesskey(node, ison, dochildren = false){
	if(node.accesskeylistid && accesskeys.nodekeys[node.accesskeylistid])
		toggleaccesskey(node, ison);
	if(dochildren)
		node.children.forEach((subnode)=>{
			setactiveaccesskey(subnode, ison, dochildren);
		});
}
function toggleaccesskey(node, ison){
	if((typeof node.accesskeylistid)!='number' || !accesskeys.nodekeys[node.accesskeylistid])
		return false;
	node.accessKey = ison ? accesskeys.nodekeys[node.accesskeylistid] : '';
}
function hideallmenus(menunode, firstpass=true){
	menunode.submenus.forEach(a=>hideallsubmenus(a,firstpass));
}
function hideallsubmenus(submenunode, firstpass=true){
	showmenu(submenunode, false, firstpass);
	setselected(submenunode.parentElement, false);
	submenunode.menubar.children.forEach(
		(n)=>toggleaccesskey(n,true)
	);
}
function showmenu(node, vis=true, firstpass=true){
	if(firstpass)
		hideallmenus(node.menubar, false);
	setselected(node.parentElement, true);
	var status = setvisible(getsubmenu(node), true);
	if(vis)
		node.children.forEach((item)=>{
			node.menubar.children.forEach((submenu)=>{
				if(submenu.accessKey && submenu.accessKey == item.accessKey)
					toggleaccesskey(submenu, false);
			})
		});
	return status;
}
function setvisible(node, vis=true){
	setactiveaccesskey(node, vis, true);
}
const basemenuitemnode = document.createElement('div');{
	basemenuitemnode.className = 'menubaritem';
}
var menubarelementlist;
function makemenunode(elem, ent){
	var node = basemenuitemnode.cloneNode(true);
	node.innerHTML = ent.text;
	node.menubar = elem;
	if(ent.accessKey){
		if(ent.text.includes(ent.accessKey)){
			node.accessKey=ent.accessKey;
			node.innerHTML=node.innerHTML.replace(RegExp("("+ent.accessKey+")"),"<u>$1</u>");
			addAccessKey(node, ent.accessKey, 'menumenu', ((e)=>{
				if(node.menubar.selected){
					showmenu(node.submenu);
					return true;
				}
				return false;
			}));
		}
		else
			throw 'invalid accessKey "'+ent.accessKey+'" for label "'+ent.text+'".';
	}
	node.submenu = makemenusubmenus(node, ent.entries);
	var doselectifactive = (e)=>{
		if(menubars.active){
			if(e.button==0){
				if(activepointerid>0 && e.pointerId!=activepointerid)
					return;
				
				activepointerid = e.pointerId;
				menubarelementlist.forEach(mb=>{
					setattribute(mb, 'selected', false);
					mb.selected = false;
					hideallmenus(mb);
				});
				if(e.button==0){
					setattribute(node.menubar, 'selected', true);
					node.menubar.selected = true;
				}
				showmenu(node.submenu);
			}
		}
		e.stopPropagation();
		e.preventDefault(true);
	}
	node.addEventListener('pointerdown', doselectifactive);
	node.addEventListener('click', doselectifactive);
	node.addEventListener('pointerenter', (e)=>{
		if(activepointerid>0 && e.pointerId!=activepointerid)
			return;
		activepointerid = e.pointerId;
		if(node.menubar.selected)
			showmenu(node.submenu);
	});
	return node;
}
const basesubmenunode = document.createElement("table");{
	basesubmenunode.className = "menubarmenu";
}
function makemenusubmenus(menunode, entries){
	var submenuelement = basesubmenunode.cloneNode(true);
	submenuelement.menubar = menunode.menubar;
	var k=0;
	entries.forEach((ent)=>{
		makemenuitemnode(submenuelement, ent, k++);
	});
	menunode.appendChild(submenuelement);
	return submenuelement;
}
const basesubmenuitemcheckboxnode = document.createElement("div");{
	basesubmenuitemcheckboxnode.className = "menubarmenuitemcheckbox";
}
const basesubmenuseparatornoderow = document.createElement("tr");{
	let basesubmenuseparatornode1 = document.createElement("td");
	let basesubmenuseparatornode2 = document.createElement("td");
	setattribute(basesubmenuseparatornode2, "colspan", 2);
	let basesubmenuseparatornodesubnode = document.createElement("div");
	basesubmenuseparatornodesubnode.className = "menubarmenuitemseparator";
	basesubmenuseparatornode2.appendChild(basesubmenuseparatornodesubnode);
	basesubmenuseparatornoderow.appendChild(basesubmenuseparatornode1);
	basesubmenuseparatornoderow.appendChild(basesubmenuseparatornode2);
}
const basesubmenuitemnode = document.createElement("tr");{
	basesubmenuitemnode.className = "menubarmenuitem";
}
const basesubmenuitemoptiongroup = document.createElement("tr");{
	basesubmenuitemoptiongroup.className = "menubarmenuitemoptiongroup";
}
const baseshortcutkeytextnode = document.createElement("td");{
	baseshortcutkeytextnode.className="menubarshortcutkeytext";
}
function makemenuitemnode(submenunode, ent, menuitemindex){
	var node;
	if(ent.separator){
		node = basesubmenuseparatornoderow.cloneNode(true);
	}else{
		node = basesubmenuitemnode.cloneNode(true);
		var checkboxnodecontainer = document.createElement("td");
		var checkboxnode = basesubmenuitemcheckboxnode.cloneNode(true);
		checkboxnodecontainer.appendChild(checkboxnode);
		node.appendChild(checkboxnodecontainer);
		var namenode = document.createElement("td");
		namenode.innerHTML = ent.text;
		node.appendChild(namenode);
		var shortcutkeytextnode = baseshortcutkeytextnode.cloneNode(true);
		var funargs = ({
			isChecked: (()=>{
				var a = getattribute(checkboxnode, "checked");
				return (a!=undefined && a!=null) && (a.value=="true");
			}),
			setChecked: ((a)=>{
				setattribute(checkboxnode, "checked", a);
			}),
		});
		node.menubar_setChecked = funargs.setChecked;
		node.menubar_isChecked = funargs.isChecked;
		if(ent.checked){
			funargs.setChecked(ent.checked);
		}
		if(ent.group){
			setattribute(node, 'data-group', ent.group);
		}
		var fnct = ent.fun?(e=>{
				setattribute(node.menubar, 'selected', false);
				node.menubar.selected = false;
				setvisible(submenunode, false);
				setselected(submenunode.parentElement, false);
				if(menubars.active){
					if(ent.group){
						submenunode.rows.forEach(a=>{if(a.dataset.group==ent.group)a.menubar_setChecked(false)})
						funargs.setChecked(true);
					}
					else if(ent.toggleable)
						funargs.setChecked(!funargs.isChecked());
					ent.fun(funargs,e);
				}
			}):(e=>{});
		if(ent.accessKey){
			if(ent.text.includes(ent.accessKey)){
				node.accessKey=ent.accessKey;
				namenode.innerHTML=namenode.innerHTML.replace(RegExp("("+ent.accessKey+")"),"<u>$1</u>");
				addAccessKey(node, ent.accessKey, 'menuitem', ((e)=>{
					if(node.menubar.selected){
						setattribute(node.menubar, 'selected', false);
						node.menubar.selected = false;
						hideallsubmenus(submenunode);
						fnct(e);
						return true;
					}
					return false;
				}));
			}
			else
				throw 'invalid accessKey "'+ent.accessKey+'" for label "'+ent.text+'".';
		}
		if(ent.shortcutkey){
			shortcutkeytextnode.innerHTML = ent.shortcutkey;
			addShortcutKey(ent.shortcutkey, ((e)=>{
				if(!node.menubar.selected){
					fnct(e);
					return true;
				}
				return false;
			}));
		}
		node.appendChild(shortcutkeytextnode);
		node.addEventListener('pointerup', (e)=>{
			if(e.pointerId!=activepointerid)
				return false;
			activepointerid = -1;
			if(e.button==0){
				fnct(e);
				node.menubar.children.forEach((elem)=>{
					toggleaccesskey(elem, true);
				})
			}
			//setactiveaccesskey(node.menubar, true);
			e.stopPropagation();
			e.preventDefault(true);
		});
		node.addEventListener('click', (e)=>{
			node.dispatchEvent(new Event('pointerup'));
			e.stopPropagation();
			e.preventDefault(true);
		});
		node.addEventListener('pointerover', e=>{
			node.classList.add('menubarmenuitemhover');
		});
		node.addEventListener('pointerout', e=>{
			node.classList.remove('menubarmenuitemhover');
		});
	}
	node.menuitemindex=menuitemindex;
	node.menubar = submenunode.menubar;
	submenunode.appendChild(node);
	return node;
}
function initMenubars(menubarlist){
	menubarelementlist = Object.entries(menubarlist).map((menubarlistentry)=>{
		var elem = document.getElementById(menubarlistentry[0]);
		elem.className="menubar";
		setattribute(elem, 'selected', false);
		elem.selected = false;
		var k=0;
		elem.submenus = (menubarlistentry[1].map((ent)=>{
			var menuitem = makemenunode(elem, ent);
			menuitem.menuindex = k;
			return elem.appendChild(menuitem);
		})).map(e2=>e2.lastChild);
		elem.setActivatable = ((boolval)=>{
			
		});
		return elem;
	});
	var hidemenubars = (e)=>{
		menubarelementlist.forEach(bar=>{
			if(bar.selected && bar.submenus){
				setattribute(bar, 'selected', false);
				bar.selected = false;
				hideallmenus(bar);
			}
		});
	}
	document.addEventListener('click', hidemenubars);
	document.addEventListener('blur', hidemenubars);
	window.addEventListener('blur', hidemenubars);
	var fn2=((e,el,ch)=>{
		var r;
		if(r=(el.elem.accessKey==ch))
			el.fn(e);
		return r;
	});
	var f=((e)=>{
		var r=false;
		var ch=e.key.toLowerCase();
		var k=shortcutkeys[ch];
		if(k)
			k.forEach(fun=>(r|=fun(e)));
		if(!r && (k=accesskeys.map[ch]) && k.menuitem)
			k.menuitem.forEach(el=>(r|=fn2(e,el,ch)));
		if(!r && k && k.menumenu)
			k.menumenu.forEach(el=>(r|=fn2(e,el,ch)));
		return r;
	})
	document.addEventListener('keydown', e=>{
		if((e.key=="Alt" || (e.key=="Shift" && e.altKey) || e.key=="F10") && !e.ctrlKey && !e.metaKey){
//TODO add alt key selects menubar
			menubarelementlist
		}
		else if(e.key=="Escape")
			f(e);
		var selectednode = document.getElementsByClassName("menubarmenuitemhover")[0];
		var selectedmenubaritem = document.getElementsByClassName("menubaritem").filter(a=>a.attributes.selected && a.attributes.selected.value=="true")[0];
		if(e.key.includes("Arrow")){
			var newnode;
			if(e.key=="ArrowLeft" || e.key=="ArrowRight"){
				if(selectedmenubaritem){
					
				}
			}
//TODO add arrow key support (arrow keys really buggy, pls fix)
			if(e.key=="ArrowDown" || e.key=="ArrowUp"){
				if(selectednode){
					newnode = selectednode;
					do{
						newnode = selectedmenubaritem.lastChild.rows[(newnode.menuitemindex+(e.key=="ArrowUp"?-1:1)+selectedmenubaritem.lastChild.rows.length)%selectedmenubaritem.lastChild.rows.length];
					}
					while(!newnode.classList.contains("menubarmenuitem"));
				}
				else
					newnode = selectedmenubaritem.lastChild.rows[(e.key=="ArrowUp"?selectedmenubaritem.lastChild.rows.length:0)];
				if(selectednode)
					selectednode.dispatchEvent(new Event('pointerout'));
				newnode.dispatchEvent(new Event('pointerover'));
				window.setTimeout(()=>{newnode.dispatchEvent(new Event('pointerover'));},1);
			}
		}
		//return;
	});
	document.addEventListener('keyup', e=>{
		if(e.key=="Alt" || e.key=="F10"){
//TODO add alt key selects menubar
//Note: Firefox has a bug so this won't work
			
		}
		var v = f(e);
		//return;
	});
	menubars.active = true;
}
return initMenubars;
})();

function debugEvents(element){
	if(!element || element.debuggingevents)
		return false;
	element.debuggingevents=true
	Object.keys(HTMLElement.prototype).filter((s)=>(
		s.startsWith("on") && !s.endsWith("move")
)
	).forEach((e)=>{
		var f=element[e];
		element[e] = f ?
			((evt)=>{
				console.log(evt);
				f(evt);
			}) : console.log
	});
	return true;}
