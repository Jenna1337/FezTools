<?php
require "localcache.php";

function getElementByAttribute($parent, $attrName, $attrVal = null)
{
	$elems = $parent->getElementsByTagName('*');
	foreach ($elems as $elem)
	{
		if($elem->hasAttribute($attrName))
		{
			if($attrVal !== null)
			{
				if($attrVal == $elem->getAttribute($attrName))
				{
					return $elem;
				}
			}
			else
			{
				return $elem;
			}
		}
	}
}

cacheRemotePage("https://github.com/stars/Jenna1337/lists/fez-game-tools-mods", "fezmodlist.html.txt", function($html){
	libxml_use_internal_errors(true);
	$doc = new DOMDocument();
	$doc->loadHTML($html);
	
	//echo $doc->saveHTML($doc->getElementById("user-list-repositories"));
	
	// Step 1: Create a new array to hold the entries
	$q = [];
	
	// Step 2: Retrieve entries into an array
	$entries = $doc->getElementById('user-list-repositories')->childNodes;
	
	foreach ($entries as $entry) {
		if ($entry->nodeType === XML_ELEMENT_NODE) {
			$catmatch = [
				["Skins", '/\b(?:skins?|replac(?:es?|ing))\b|Skin\b/'],
				["Tools", '/extract|repack|unpack|viewer|decompil|\bmodding\b/i'],
				["Mods", '/\b(?:mod(?!loader))\b|Mod\b|random/'],
				["undefined", '/./']
			];
			
			$lnk = $entry->getElementsByTagName('a')->item(0);
			$names = explode('/', trim($lnk->textContent));
			$category = "undefined"; // Default category
			
			foreach ($catmatch as $pattern) {
				if (preg_match($pattern[1], $entry->textContent)) {
					$category = $pattern[0];
					break;
				}
			}
			$descElem = getElementByAttribute($entry, 'itemprop', 'description');
			$description = $descElem ? $descElem->textContent : '';
			$dateElem = getElementByAttribute($entry, 'datetime');
			$lastupdate = $dateElem ? $dateElem->getAttribute('datetime') : '';
			
			$q[] = [
				"name" => trim($names[1]),
				"author" => trim($names[0]),
				"category" => $category,
				"href" => $lnk->getAttribute('href'),
				"description" => trim($description),
				"lastupdate" => $lastupdate
			];
		}
	}

	// Step 3: Sort by name
	usort($q, function($a, $b) {
		return strcasecmp($a['name'], $b['name']);
	});

	// Step 4: Group items by category
	$groupeditems = [];
	foreach ($q as $item) {
		$groupeditems[$item['category']][] = $item;
	}

	// Step 5: Create the HTML structure
	$listlistelem = $doc->createElement("ul");
	$listlistelem->setAttribute("role", "tree");
	$listlistelem->setAttribute("aria-labelledby", "treetitle");

	foreach ($groupeditems as $category => $items) {
		$elemlistelem = $doc->createElement("li");
		$elemlistelem->setAttribute("role", "treeitem");

		$listelem = $doc->createElement("ul");
		$listelem->setAttribute("role", "group");
		$listelem->setAttribute("id", $category . "Group");

		// Create category element
		$categoryElem = $doc->createElement("span", $category);
		$categoryElem->setAttribute("class", "category");
		$categoryElem->setAttribute("aria-owns", "listelem.id");
		$categoryElem->setAttribute("aria-expanded", "true");

		$elemlistelem->appendChild($categoryElem);

		foreach ($items as $it) {
			$elem = $doc->createElement("li");
			$author = $doc->createElement("span");
			$author->setAttribute("class", "author");
			$author->textContent = $it['author'];
			$name = $doc->createElement("span");
			$name->setAttribute("class", "name");
			$name->textContent = $it['name'];
			$link = $doc->createElement("a");
			$link->appendChild($author);
			$link->appendChild($doc->createTextNode(' / '));
			$link->appendChild($name);
			$link->setAttribute("href", "https://github.com/{$it['author']}/{$it['name']}/");

			$lastDate = $doc->createElement("date", $it['lastupdate']);
			$lastDate->setAttribute("class", "lastupdated");
			$lastDate->setAttribute("datetime", $it['lastupdate']);
			
			$desc = $doc->createElement("span", $it['description']);
			$desc->setAttribute("class", "description");

			$elem->appendChild($link);
			$elem->appendChild($lastDate);
			$elem->appendChild($desc);
			$elem->setAttribute("role", "treeitem");

			$listelem->appendChild($elem);
		}
		$elemlistelem->appendChild($listelem);
		$listlistelem->appendChild($elemlistelem);
	}

	// Step 6: Insert the new HTML structure into the document
	$treeTitle = $doc->createElement("span", "Fez Mod Categorizer");
	$treeTitle->setAttribute("id", "treetitle");
	$treeTitle->setAttribute("class", "category");
	$treeTitle->setAttribute("role", "presentation");

	$container = $doc->createElement("div");
	$container->appendChild($treeTitle);
	$container->appendChild($listlistelem);
?>
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="author" content="Jenna Sloan" />
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
<div style="display:nonea">
<!-- 
From https://github.com/stars/Jenna1337/lists/fez-game-tools-mods
-->
<?php
// Output the final HTML
	echo $doc->saveHTML($container);
});

?>
</div>
</body>
</html>