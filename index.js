const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const verifyJWT=(req,res,next)=>{
  const authorization=req.headers.authorization
  if(!authorization){
    return res.status(401).send({error:true,message:"unauthorized token"})
  }
  //bearer token 
  const token=authorization.split(" ")[1]
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
    if(err){
      return res.status(403).send({error:true,message:"unauthorized token"})
    }
    req.decoded=decoded
    next()
  })
}
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pgeg54g.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const usersCollection = client.db("BistroBossDB").collection("users");
    const menuCollection = client.db("BistroBossDB").collection("MenuItem");
    const reviewCollection = client
      .db("BistroBossDB")
      .collection("ReviewsItem");
    const cartCollection = client.db("BistroBossDB").collection("carts");

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token=jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn: '1h'})
      res.send({token})
    });

//Warning: use verifyJWT before using verifyAdmin
const verifyAdmin=async(req,res,next)=>{
  const email=req.decoded.email
  const query={email:email}
  const user=await usersCollection.findOne(query)
  if(user?.role!=="admin"){
    res.status(403).send({error:true,message:"forbidden message"})
  }
  next()
}

 /* --------------
    //do not show secure links to those who should not see the links
    //use jwt token: verifyJWT
    //use verifyAdmin middleware
 ----------------- */


    ///users related apis

    app.get("/users",verifyJWT,verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });
    app.post("/users", async (req, res) => {
      const users = req.body;
      const query = { email: users.email };
      const existingUsers = await usersCollection.findOne(query);
      console.log("existing users", existingUsers);
      if (existingUsers) {
        return res.send({ message: "user already exists" });
      }
      const result = await usersCollection.insertOne(users);
      res.send(result);
    });
    //Security Check

    //1st layer: verifyJWT
    //2nd layer: verify email same or not\
    //3rd layer: check admin
    app.get("/users/admin/:email",verifyJWT,async(req,res)=>{
      const email=req.params.email;
      console.log(email)
      if(req.decoded.email!==email){
        res.send({admin:false})
      }
      const query={email:email}
      const users=await usersCollection.findOne(query)
      const result={admin: users?.role==="admin"}
      res.send(result)
    })
 

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });
    ///menu related apis
    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });
    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    ///cart collection
    app.get("/carts",verifyJWT, async (req, res) => {
      const email = req.query.email;
      console.log(email);
      if (!email) {
        res.send([]);
      }
      // const decodedEmail=req.headers.email
      const decodedEmail = req.decoded.email;
      if(email!==decodedEmail){
        return res.status(403).send({error:true,message:"forbidden access"})
      }
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });
    app.post("/carts", async (req, res) => {
      const item = req.body;
      console.log(item);
      const result = await cartCollection.insertOne(item);
      res.send(result);
    });
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("The bistro boss restaurent server is running");
});
app.listen(port, () => {
  console.log(`The bistro boss restaurent server is running on port: ${port}`);
});
