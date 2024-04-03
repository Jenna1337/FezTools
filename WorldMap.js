class QualifiedNode {
	constructor() {
		this.Node = null;
		this.Depth = 0.0;
		this.ScreenDistance = 0.0;
		this.Transparency = 0.0;
	}
}
function WorldMap(maptree, LinkThickness, fullcube)
{
	String.prototype.GetSizeFactor = function()
	{
		switch (String(this))
		{
		case "Hub":
			return 2;
		case "Lesser":
			return 0.5;
		case "Node":
			return 1;
		default:
			throw "InvalidOperationException";
		}
	}
	const LevelNodeType = {
		Hub: "Hub",
		Lesser: "Lesser",
		Node: "Node",
	};
	const NodeGroupDataComparer = {
		Compare: function(x, y) {
			return -(x.CustomData).Depth.CompareTo((y.CustomData).Depth);
		}
	};
	const ZoomCycle = [ 80, 40, 20, 10, 5 ];
	const MapTree = maptree;
	MapTree.Root = MapTree[0];
	var NodesMesh;
	var LinksMesh;
	var GoldenHighlightsGeometry;
	var WhiteHighlightsGeometry;
	var LinksGeometry;
	const GrabbedCursor = "grabbing";
	const CanClickCursor = "pointer";
	const ClickedCursor = "pointer";
	const PointerCursor = "default";
	var ZoomLevel = ZoomCycle.length / 2;
	const GoldColor = "rgb(255, 190, 36)";
	var sewerQRGroup;
	var zuhouseQRGroup;
	
	
	_=(function(){
		LastFocusedNode = (FocusNode = (CurrentNode = MapTree.Root));
		NodesMesh = [];
		LinksMesh = [];
		LinksGeometry = CreateLinksGroup("white", false);
		var list = [];
		BuildNodes(MapTree.Root, null, null, Vector3.Zero, list);
		LinksGeometry.Instances = list;
		ZoomLevel = 2;
	})();
	
	function GetTexture(filepath){
		return filepath.toLowerCase()+".png";//TODO
	}
	function DrawCube(Size, Position, color){
		const cubesize = 50;
		const linesize = cubesize;
		var cube = {"Size": Size, "Position": Position, "Color":color};
		
		var boxcontainer = document.createElement("div");
		var boxX = document.createElement("div");boxX.style.rotate = "x 90deg"; boxX.role = "presentation";
		var boxY = document.createElement("div");boxY.style.rotate = "y 90deg"; boxY.role = "presentation";
		var boxZ = document.createElement("div");                             ; boxZ.role = "presentation";
		boxX.style.width = boxX.style.height = boxY.style.width = boxY.style.height = boxZ.style.width = boxZ.style.height = cubesize+"px";
		if(fullcube){
			var boxX2 = document.createElement("div");boxX2.style.rotate = "x 90deg"; boxX2.role = "presentation";
			var boxY2 = document.createElement("div");boxY2.style.rotate = "y 90deg"; boxY2.role = "presentation";
			var boxZ2 = document.createElement("div");                              ; boxZ2.role = "presentation";
			boxX2.style.width= boxX2.style.height= boxY2.style.width= boxY2.style.height= boxZ2.style.width= boxZ2.style.height= cubesize+"px";
			
			boxY.style.translate=linesize/2+"px";
			boxX.style.translate="0 "+(linesize/2)+"px";
			boxZ.style.translate="0 0 "+(linesize/2)+"px";
			
			boxY2.style.translate=-linesize/2+"px";
			boxX2.style.translate="0 "+(-linesize/2)+"px";
			boxZ2.style.translate="0 0 "+(-linesize/2)+"px";
		}
		boxcontainer.style.width = boxcontainer.style.height = cubesize+"px";
		boxcontainer.appendChild(boxX);
		boxcontainer.appendChild(boxY);
		boxcontainer.appendChild(boxZ);
		if(fullcube){
			boxcontainer.appendChild(boxX2);
			boxcontainer.appendChild(boxY2);
			boxcontainer.appendChild(boxZ2);
		}
		boxcontainer.className = "maplink";
		cube.BaseElement = boxcontainer;
		return cube;
	}
	
	function CreateLinksGroup(color, isComplete)
	{
		var group = DrawCube(1, {X:0,Y:0,Z:0}, color)
		group.CustomData = isComplete;
		LinksMesh.push(group);
		return group;
	}
	function BuildNodes(node, parentConnection, parentNode, offset, instances)
	{
		if(!offset || Number.isNaN(offset.X) || Number.isNaN(offset.Y) || Number.isNaN(offset.Z)){
			debugger;
		}
		var group = DrawCube(node.NodeType.GetSizeFactor(), Vector3.Zero, "white");
		group.Position = offset;
		group.CustomData = {
			Node: node,
			LevelName: node.LevelName
		};
		node.Group = group;
		
		if (group != null)
		{
			group.Texture = GetTexture("map_screens/" + node.LevelName);
			
			if (node.LevelName == "SEWER_QR")
			{
				sewerQRGroup = group;
				sewerQRXbox = group.Texture;
				sewerQRSony = GetTexture("map_screens/" + node.LevelName + "_SONY");
			}
			else if (node.LevelName == "ZU_HOUSE_QR")
			{
				zuhouseQRGroup = group;
				zuhouseQRXbox = group.Texture;
				zuhouseQRSony = GetTexture("map_screens/" + node.LevelName + "_SONY");
			}
		}
		for (var c2 of node.Connections)
		{
			if (c2.Node.NodeType == LevelNodeType.Lesser && node.Connections.some((x) => x.Face == c2.Face && c2.Node.NodeType != LevelNodeType.Lesser))
			{
				if (!node.Connections.some((x) => x.Face == FaceOrientation.Top))
				{
					c2.Face = FaceOrientation.Top;
				}
				else if (!node.Connections.some((x) => x.Face == FaceOrientation.Down))
				{
					c2.Face = FaceOrientation.Down;
				}
			}
		}
		for (var c of node.Connections)
		{
			if(!c.hasOwnProperty("MultiBranchId")){
				c.MultiBranchId = 0;
			}
		}
		for (var c of node.Connections)
		{
			c.MultiBranchId = Math.max(...node.Connections.filter((x) => x.Face == c.Face).map((x) => x.MultiBranchId)) + 1;
			if(Number.isNaN(c.MultiBranchId)){
				debugger
			}
			c.MultiBranchCount = node.Connections.filter((x) => x.Face == c.Face).length;
		}
		var num = 0;
		for (var item of node.Connections.sort((x,y) => y.Node.NodeType.GetSizeFactor()-x.Node.NodeType.GetSizeFactor()))
		{
			if (parentConnection != null && item.Face == parentConnection.Face.GetOpposite())
			{
				item.Face = item.Face.GetOpposite();
			}
			var num3 = 3 + (node.NodeType.GetSizeFactor() + item.Node.NodeType.GetSizeFactor()) / 2;
			if ((node.NodeType == LevelNodeType.Hub || item.Node.NodeType == LevelNodeType.Hub) && node.NodeType != LevelNodeType.Lesser && item.Node.NodeType != LevelNodeType.Lesser)
			{
				num3 += 1;
			}
			if ((node.NodeType == LevelNodeType.Lesser || item.Node.NodeType == LevelNodeType.Lesser) && item.MultiBranchCount == 1)
			{
				num3 -= (item.Face.IsSide() ? 1 : 2);
			}
			num3 *= 1.25 + item.BranchOversize;
			var num4 = num3 * 0.375;
			if (item.Node.NodeType == LevelNodeType.Node && node.NodeType == LevelNodeType.Node)
			{
				num4 *= 1.5;
			}
			var vector = item.Face.AsVector();
			var vector2 = Vector3.Zero;
			if (item.MultiBranchCount > 1)
			{
				vector2 = MultiplyVectors(new Vector3((item.MultiBranchId - 1) - (item.MultiBranchCount - 1) / 2), SubtractVectors(Vector3.XZMask, item.Face.AsVector().Abs()), num4);
			}
			BuildNodes(item.Node, item, node, AddVectors(offset, MultiplyVectors(vector, num3), vector2), instances);
			
			if (item.LinkInstances == null)
			{
				item.LinkInstances = [];
			}
			if (item.MultiBranchCount > 1)
			{
				num = Math.max(num, num3 / 2);
				var vectora = MultiplyVectors(vector, num);
				var vector3 = AddVectors(vectora, new Vector3(LinkThickness));
				var vector4 = AddVectors(DivideVectors(vectora, new Vector3(2)), offset);
				item.LinkInstances.push(instances.length);
				instances.push(new Matrix(vector4.X, vector4.Y, vector4.Z, 0, 1, 1, 1, 1, vector3.X, vector3.Y, vector3.Z, 0, 0, 0, 0, 0));
				vector3 = AddVectors(vector2, new Vector3(LinkThickness));
				vector4 = AddVectors(DivideVectors(vector2, new Vector3(2)), offset, vectora);
				item.LinkInstances.push(instances.length);
				instances.push(new Matrix(vector4.X, vector4.Y, vector4.Z, 0, 1, 1, 1, 1, vector3.X, vector3.Y, vector3.Z, 0, 0, 0, 0, 0));
				var num5 = num3 - num;
				var vectorb = MultiplyVectors(vector, num5);
				vector3 = AddVectors(vectorb, new Vector3(LinkThickness));
				vector4 = AddVectors(DivideVectors(vectorb, new Vector3(2)), offset, vectora, vector2);
				item.LinkInstances.push(instances.length);
				instances.push(new Matrix(vector4.X, vector4.Y, vector4.Z, 0, 1, 1, 1, 1, vector3.X, vector3.Y, vector3.Z, 0, 0, 0, 0, 0));
			}
			else
			{
				var vector5 = AddVectors(MultiplyVectors(vector, num3), new Vector3(LinkThickness));
				var vector6 = AddVectors(DivideVectors(MultiplyVectors(vector, num3), 2), offset);
				item.LinkInstances.push(instances.length);
				instances.push(new Matrix(vector6.X, vector6.Y, vector6.Z, 0, 1, 1, 1, 1, vector5.X, vector5.Y, vector5.Z, 0, 0, 0, 0, 0));
			}
			DoSpecial(item, offset, vector, num3, instances);
			
			item.Node.Connections.push(
			{
				Node: node,
				Face: item.Face.GetOpposite(),
				BranchOversize: item.BranchOversize,
				LinkInstances: item.LinkInstances
			});
		}
		NodesMesh.push(group);
	}
	function DoSpecial(c, offset, faceVector, sizeFactor, instances)
	{
		if (c.Node.LevelName == "LIGHTHOUSE_SPIN")
		{
			let num = 3.425;
			let backward = MultiplyVectors(Vector3.Backward, num);
			let vector = AddVectors(backward, new Vector3(LinkThickness));
			let vector2 = AddVectors(DivideVectors(backward, 2) , offset , MultiplyVectors(faceVector, sizeFactor));
			c.LinkInstances.push(instances.length);
			instances.push(new Matrix(vector2.X, vector2.Y, vector2.Z, 0, 1, 1, 1, 1, vector.X, vector.Y, vector.Z, 0, 0, 0, 0, 0));
		}
		if (c.Node.LevelName == "LIGHTHOUSE_HOUSE_A")
		{
			let num2 = 5;
			let right = MultiplyVectors(Vector3.Right, num2);
			let vector3 = AddVectors(right, new Vector3(LinkThickness));
			let vector4 = AddVectors(DivideVectors(right, 2) , offset , MultiplyVectors(faceVector, sizeFactor));
			c.LinkInstances.push(instances.length);
			instances.push(new Matrix(vector4.X, vector4.Y, vector4.Z, 0, 1, 1, 1, 1, vector3.X, vector3.Y, vector3.Z, 0, 0, 0, 0, 0));
		}
	}
	return ({
		"NodesMesh":NodesMesh,
		"LinksMesh": LinksMesh,
	});
}

