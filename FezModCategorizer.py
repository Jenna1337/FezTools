import urllib.request
from html.parser import HTMLParser
import xml.etree.ElementTree as ET
import re

### Converted by hand from PHP

OUTPUT_FILE_NAME = "FezModCategorizer.html"

base_html_start = """
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="author" content="Jenna Sloan" />
<meta name="generator" content="FezModCategorizer.py" />
<title>Fez Mod Categorizer</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light dark" />
<style>

*{
	border-color: currentColor;
	border-color: CanvasText;
}

.category {
	font-size: larger;
}
ul .category {
	font-size: larg;
}
.author {
	
}
.name {
	font-weight: bold;
}
date {
	font-size: small;
	display: inline-block;
}
.lastupdated:before {
	content: "Last Updated: ";
}
.description {
	padding-inline-start: 4ex;
	padding-block: 0.5ex;
	display: block;
}
ul{
	border-inline-start: 1px dashed gray;
	margin-top: 0;
}
li{
	border-block-end-width: 1px;
	border-block-end-style: solid;
	padding: 1px;
}
a {
	text-underline-position: under;
	padding-inline-end: 3ex;
	font-size: large;
	display: inline-block;
}
span:has(+ul){
	border-block-end: 1px dashed gray;
	display: block;
}

li:has(.category[aria-expanded="true"]) {
	list-style-type: disclosure-open;
}
li:has(.category[aria-expanded="false"]) {
	list-style-type: disclosure-closed;
}
.category[aria-expanded="true"]~[role="group"] {
	height: calc-size(auto, size);
}
.category[aria-expanded="false"]~[role="group"] {
	height: 0;
	display: none;
}
.category~[role="group"]{
	transition-property: all;
	transition-duration: 0.25s;
	transition-behavior: allow-discrete;
	overflow: hidden;
}
</style>
<script>
document.addEventListener("DOMContentLoaded",()=>{
	document.querySelectorAll("[aria-expanded]").forEach(categoryElem=>{
		categoryElem.addEventListener("click",a=>categoryElem.setAttribute("aria-expanded", categoryElem.getAttribute("aria-expanded")=="true"?"false":"true"));
	});
});
</script>
</head>
<body dir="auto">
<noscript>
This page requires JavaScript
</noscript>
<div style="">
<!-- 
From https://github.com/stars/Jenna1337/lists/fez-game-tools-mods
-->
"""
base_html_end = """
</div>
</body>
</html>
"""

TEXT_NODE_TAG = "x-CDATA"
class MyHTMLParser(HTMLParser):
    # void tag list from https://developer.mozilla.org/en-US/docs/Glossary/Void_element
    VOID_TAGS = ["area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"]
    
    def __init__(self):
        super().__init__()
        self.root = None
        self.currentPath = []
        self.tree = None

    @staticmethod
    def __blankNone(keyPair):
        keyPair = list(keyPair)
        if(keyPair[1] == None):
            keyPair[1] = ""
        return tuple(keyPair)

    def handle_starttag(self, tag, attrs):
        #you need to blank the attributes with None as the value otherwise it can fail to convert them to strings later on
        attrs = dict(map(self.__blankNone, attrs))
        if(self.root == None):
            self.root = ET.Element(tag, attrs)
            self.currentPath.append(self.root)
        else:
            newElem = ET.SubElement(self.currentPath[-1], tag, attrs)
            self.currentPath.append(newElem)
            if(tag in self.VOID_TAGS):
                self.handle_endtag(tag)
        #print(tag, attrs);
        return

    def handle_endtag(self, tag):
        #print("/"+tag + " =?= " + self.currentPath[-1].tag);
        #print(list(map(lambda e: e.tag, self.currentPath)))
        if(tag == self.currentPath[-1].tag):
            self.currentPath.pop()
        return

    def handle_data(self, data):
        if(0 >= len(data)):
            return
        if(0 < len(self.currentPath)):
            # special node needed to maintain the order of the data and elements
            textLeaf = ET.SubElement(self.currentPath[-1], TEXT_NODE_TAG, {})
            textLeaf.text = data
        return
    
    def element_tree(self):
        if(self.tree == None):
            self.tree = ET.ElementTree(self.root)
        return self.tree
    
    def tostring(self):
        text = ET.tostring(self.root, encoding='unicode', xml_declaration=True);
        text = text.replace("<"+TEXT_NODE_TAG+">", "<![CDATA[")
        text = text.replace("</"+TEXT_NODE_TAG+">", "]]>")
        return text

def getElementById(parent, target_id):
    return parent.find(f".//*[@id='{target_id}']")

def getElementByAttribute(parent, attr_name, attr_val = None):
    if(attr_val == None):
        return parent.find(f".//*[@{attr_name}]")
    return parent.find(f".//*[@{attr_name}='{attr_val}']")

def getElementsByTagName(parent, tag_name):
    return parent.findall('.//'+tag_name)

def textContent(parent):
    return ''.join(map(lambda elem: elem.text, getElementsByTagName(parent, TEXT_NODE_TAG)))

def createTextNode(text):
    node = ET.Element('span')
    node.text = text
    return node

url = 'https://github.com/stars/Jenna1337/lists/fez-game-tools-mods'
try:
    with urllib.request.urlopen(url) as response:
        html = response.read().decode('utf-8')
        try:
            parser = MyHTMLParser()
            parser.feed(html)
            #ET.indent(tree, space="  ", level=0) # Use 2 spaces for indentation
            #text = parser.tostring()
            #print(text);
            #with open("output.xml", "w", encoding="utf-8") as file:
            #    file.write(text)
            
            # Step 1: Create a new array to hold the entries
            q = [];
            
            # Step 2: Retrieve entries into an array
            entries = list(getElementById(parser.root, 'user-list-repositories'));
            catmatch = [
                ("Skins", r'\b(?:skins?|replac(?:es?|ing))\b|Skin\b'),
                ("Tools", r'extract|repack|unpack|viewer|decompil|\bmodding\b'),
                ("Mods", r'\b(?:mod(?!loader))\b|Mod\b|random'),
                ("undefined", r'.')
            ]
            for entry in entries:
                if(entry.tag != TEXT_NODE_TAG):
                    lnk = getElementsByTagName(entry, 'a')[0];
                    names = textContent(lnk).strip().split('/')
                    category = "undefined"; # Default category
                    
                    for pattern in catmatch:
                        if(re.search(pattern[1], textContent(entry), re.IGNORECASE)):
                            category = pattern[0];
                            break;
                    
                    descElem = getElementByAttribute(entry, 'itemprop', 'description');
                    description = textContent(descElem) if descElem else '';
                    dateElem = getElementByAttribute(entry, 'datetime');
                    lastupdate = dateElem.get('datetime') if dateElem else '';
                    
                    q.append({
                        "name": names[1].strip(),
                        "author": names[0].strip(),
                        "category": category,
                        "href": lnk.get('href'),
                        "description": description.strip(),
                        "lastupdate": lastupdate
                    });
            
            # Step 3: Sort by name
            q.sort(key= lambda entry: entry.get('name'))
            
            # Step 4: Group items by category
            groupeditems = dict(map(lambda c: (c[0], []), catmatch));
            for item in q:
                key = item.get('category')
                groupeditems[key].append(item);
            
            # Step 5: Create the HTML structure
            listlistelem = ET.Element("ul", {
                "role": "tree",
                "aria-labelledby": "treetitle"
            })
            
            for category, items in groupeditems.items():
                elemlistelem = ET.Element("li", {
                    "role": "treeitem",
                });
                listelem = ET.Element("ul", {
                    "role": "group",
                    "id": category + "Group",
                });
                
                # Create category element
                categoryElem = ET.Element("span", {
                    "class": "category",
                    "aria-owns": listelem.get("id"),
                    "aria-expanded": "true"
                });
                categoryElem.text = category
                
                elemlistelem.append(categoryElem)
                
                for item in items:
                    elem = ET.Element("li", {
                        "role": "treeitem"
                    });
                    
                    author = ET.Element("span", {
                        "class": "author"
                    })
                    author.text = item['author']
                    
                    name = ET.Element("span", {
                        "class": "name"
                    })
                    name.text = item['name']
                    
                    link = ET.Element("a", {
                        "href": f"https://github.com/{item['author']}/{item['name']}/"
                    })
                    
                    link.append(author)
                    link.append(createTextNode(' / '))
                    link.append(name)
                    
                    lastDate = ET.Element("date", {
                        "class": "lastupdated",
                        "datetime": item['lastupdate']
                    })
                    lastDate.text = item['lastupdate']
                    
                    desc = ET.Element("span", {
                        "class": "description"
                    })
                    desc.text = item['description']
                    
                    elem.append(link);
                    elem.append(lastDate);
                    elem.append(desc);
                    
                    listelem.append(elem);
                    
                elemlistelem.append(listelem);
                listlistelem.append(elemlistelem);
            
            # Step 6: Insert the new HTML structure into the document
            treeTitle = ET.Element("span", {
                "id": "treetitle",
                "class": "category",
                "role": "presentation"
            })
            treeTitle.text = "Fez Mod Categorizer"

            container = ET.Element("div")
            container.append(treeTitle);
            container.append(listlistelem);
            
            text = base_html_start + ET.tostring(container, encoding='utf-8').decode('UTF-8') + base_html_end
            print(text)
            with open(OUTPUT_FILE_NAME, "w", encoding="utf-8") as file:
                file.write(text)
            
        except ET.ParseError as e:
            print(f"Error parsing XML: {e}")
except urllib.error.URLError as e:
    print(f"URL Error: {e.reason}")
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code} - {e.reason}")

exit
"""
cacheRemotePage("", "fezmodlist.html.txt", function($html){

	// Step 6: Insert the new HTML structure into the document
	$treeTitle = $doc->createElement("span", "Fez Mod Categorizer");
	$treeTitle->setAttribute("id", "treetitle");
	$treeTitle->setAttribute("class", "category");
	$treeTitle->setAttribute("role", "presentation");

	$container = $doc->createElement("div");
	$container->appendChild($treeTitle);
	$container->appendChild($listlistelem);
?>
"""