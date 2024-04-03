class Matrix{
	constructor(m11, m12, m13, m14, m21, m22, m23, m24, m31, m32, m33, m34, m41, m42, m43, m44){
		this.M11=m11;
		this.M12=m12;
		this.M13=m13;
		this.M14=m14;
		this.M21=m21;
		this.M22=m22;
		this.M23=m23;
		this.M24=m24;
		this.M31=m31;
		this.M32=m32;
		this.M33=m33;
		this.M34=m34;
		this.M41=m41;
		this.M42=m42;
		this.M43=m43;
		this.M44=m44;
	}
	toString2(){
		return `${this.M11},${this.M21},${this.M31},${this.M41},`+
		       `${this.M12},${this.M22},${this.M32},${this.M42},`+
		       `${this.M13},${this.M23},${this.M33},${this.M43},`+
		       `${this.M14},${this.M24},${this.M34},${this.M44}`;
	}
	toString(){
		return `${this.M11},${this.M12},${this.M13},${this.M14},`+
		       `${this.M21},${this.M22},${this.M23},${this.M24},`+
		       `${this.M31},${this.M32},${this.M33},${this.M34},`+
		       `${this.M41},${this.M42},${this.M43},${this.M44}`;
	}
}

class Vector3 {
	constructor(x,y=undefined,z=undefined){
		if(y==null){
			this.X = this.Y = this.Z = x;
		}else{
			this.X = x;
			this.Y = y;
			this.Z = z;
		}
	}
	static get Zero     (){return {X: 0,Y: 0,Z: 0}; }
	static get One      (){return {X: 1,Y: 1,Z: 1}; }
	static get UnitX    (){return {X: 1,Y: 0,Z: 0}; }
	static get UnitY    (){return {X: 0,Y: 1,Z: 0}; }
	static get UnitZ    (){return {X: 0,Y: 0,Z: 1}; }
	static get Up       (){return {X: 0,Y: 1,Z: 0}; }
	static get Down     (){return {X: 0,Y:-1,Z: 0}; }
	static get Right    (){return {X: 1,Y: 0,Z: 0}; }
	static get Left     (){return {X:-1,Y: 0,Z: 0}; }
	static get Forward  (){return {X: 0,Y: 0,Z:-1}; }
	static get Backward (){return {X: 0,Y: 0,Z: 1}; }
	static get XZMask   (){return {X:1, Y:0, Z:1};  }
};
Object.prototype.Abs = function()
{
	return Object.fromEntries(Object.entries(this).map(a=>{a[1]=Math.abs(a[1]);return a;}));
}
function AddVectors(...v){
	var o=Object.assign({},v[0]);
	for(var i=1;i<v.length;++i){
		var vec = v[i];
		o.X += (typeof vec)=='number'? vec : vec.X;
		o.Y += (typeof vec)=='number'? vec : vec.Y;
		o.Z += (typeof vec)=='number'? vec : vec.Z;
	}
	return o;
}
function MultiplyVectors(...v){
	var o=Object.assign({},v[0]);
	for(var i=1;i<v.length;++i){
		var vec = v[i];
		o.X *= (typeof vec)=='number'? vec : vec.X;
		o.Y *= (typeof vec)=='number'? vec : vec.Y;
		o.Z *= (typeof vec)=='number'? vec : vec.Z;
	}
	return o;
}
function SubtractVectors(...v){
	var o=Object.assign({},v[0]);
	for(var i=1;i<v.length;++i){
		var vec = v[i];
		o.X -= (typeof vec)=='number'? vec : vec.X;
		o.Y -= (typeof vec)=='number'? vec : vec.Y;
		o.Z -= (typeof vec)=='number'? vec : vec.Z;
	}
	return o;
}
function DivideVectors(...v){
	var o=Object.assign({},v[0]);
	for(var i=1;i<v.length;++i){
		var vec = v[i];
		o.X /= (typeof vec)=='number'? vec : vec.X;
		o.Y /= (typeof vec)=='number'? vec : vec.Y;
		o.Z /= (typeof vec)=='number'? vec : vec.Z;
	}
	return o;
}

const FaceOrientation = 
[
	"Left",
	"Down",
	"Back",
	"Right",
	"Top",
	"Front"
]
FaceOrientation.Left = "Left";
FaceOrientation.Down = "Down";
FaceOrientation.Back = "Back";
FaceOrientation.Right = "Right";
FaceOrientation.Top = "Top";
FaceOrientation.Front = "Front";

String.prototype.GetOpposite = function(){
	return FaceOrientation[(FaceOrientation.indexOf(String(this)) + 3) % FaceOrientation.length];
}
String.prototype.IsSide = function(){
	return (this!="Down" && this!="Top");
}
String.prototype.AsVector = function()
{
	switch (String(this))
	{
		case "Back":
			return Vector3.Forward;
		case "Front":
			return Vector3.Backward;
		case "Top":
			return Vector3.Up;
		case "Down":
			return Vector3.Down;
		case "Left":
			return Vector3.Left;
		default:
			return Vector3.Right;
	}
}


