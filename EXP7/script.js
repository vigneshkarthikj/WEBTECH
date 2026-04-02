const students = [
{name:"Rahul", marks:85, course:"CSE"},
{name:"Anjali", marks:72, course:"ECE"},
{name:"Kiran", marks:90, course:"CSE"},
{name:"Sneha", marks:65, course:"ME"},
{name:"Arjun", marks:88, course:"CSE"}
];

const products = [
{name:"Rice", price:50},
{name:"Oil", price:150},
{name:"Sugar", price:40},
{name:"Milk", price:60}
];

function display(data){
let tableBody=document.getElementById("tableBody");
tableBody.innerHTML="";

data.forEach(s=>{
let row=`<tr>
<td>${s.name}</td>
<td>${s.marks}</td>
<td>${s.course}</td>
</tr>`;
tableBody.innerHTML+=row;
});
}

function printNames(){
display(students);
}

function marksAbove80(){
let result=students.filter(s=>s.marks>80);
display(result);
}

function countCourses(){
let count=students.reduce((acc,s)=>{
acc[s.course]=(acc[s.course]||0)+1;
return acc;
},{});
document.getElementById("result").innerText=
"CSE:"+count.CSE+" ECE:"+count.ECE+" ME:"+count.ME;
}

function showCSE(){
let cseStudents=students.filter(s=>s.course==="CSE");
display(cseStudents);
}

function convertUpper(){
let upper=students.map(s=>({
name:s.name.toUpperCase(),
marks:s.marks,
course:s.course
}));
display(upper);
}

function checkExpensive(){
let expensive=products.some(p=>p.price>100);
document.getElementById("result").innerText=
expensive?"There is an expensive product":"No expensive product";
}

function totalPrice(){
let total=products.reduce((sum,p)=>sum+p.price,0);
document.getElementById("result").innerText=
"Total Price = "+total;
}