const mongoose=require("mongoose");

const UserDetailSchema =new mongoose.Schema({
    username:{type:String, unqiue:true},
    password:String,
},{
    collection:"UserInfo"
});
mongoose.model("UserInfo", UserDetailSchema)