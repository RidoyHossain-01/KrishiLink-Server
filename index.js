const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

//middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri =
  "mongodb+srv://db_user-admin:916grkbAIcIWINsN@cluster1.uahyd9e.mongodb.net/?appName=Cluster1";

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
    const db = client.db("KrishiLink-DB");
    const corpsCollection = db.collection("corps");
    const usersCollection = db.collection("users");

    app.post('/users',async(req,res)=>{
      const user = req.body;
      const existingUser = await usersCollection.findOne({email:user.email});
      if(existingUser){
        return res.send({message:'User already exists'})
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })
    app.get('/users', async(req,res)=>{
          const email = req.query.email;
          const query = {email:email};
          const user = await usersCollection.findOne(query);
          res.send(user);
    })
    

    app.get("/", async (req, res) => {
      const result = await corpsCollection.find().sort({createdAt:-1}).limit(6).toArray();
      res.send(result);
    });

    app.get("/all-crops", async (req, res) => {
      const email = req.query.email;
      // console.log(email);
      
      let query = {};
      if(email){

        query={'owner.ownerEmail':email};
      }
      console.log(query);
      
      const result = await corpsCollection.find(query).toArray();
      res.send(result);
      console.log(result);
      
    });
   
    app.patch('/crops/:id',async(req,res)=>{
      const id = req.params.id;
      const updatedCrop = req.body;
      const filter = {_id:new ObjectId(id)};
      const update = {
        $set:{
          name:updatedCrop.name,
           type:updatedCrop.type,
           pricePerUnit:updatedCrop.pricePerUnit,
           unit:updatedCrop.unit, 
           quantity:updatedCrop.quantity,
           description:updatedCrop.description,
           location:updatedCrop.location,
           image:updatedCrop.image

        }
      }
      const result = await corpsCollection.updateOne(filter,update);
        res.send(result);
    })

    app.delete('/crops/:id',async (req,res)=>{
      const id = req.params.id;
      const query = {_id:new ObjectId(id)};
      const result = await corpsCollection.deleteOne(query);res.send(result);
    })

    app.get('/crops/:id',async(req,res)=>{
      const id = req.params.id;
      const query = {_id:new ObjectId(id)};
      const result = await corpsCollection.findOne(query);
      res.send(result);
    })

    app.post("/crops", async (req, res) => {
      const newCorp = req.body;
      const result = await corpsCollection.insertOne(newCorp);
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

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
