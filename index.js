const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
//middleware
app.use(cors());
app.use(express.json());

 

const uri =
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.uahyd9e.mongodb.net/?appName=Cluster1`;

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
    const interestsCollection = db.collection("interests");

    app.post("/users", async (req, res) => {
      const user = req.body;
      const existingUser = await usersCollection.findOne({ email: user.email });
      if (existingUser) {
        return res.send({ message: "User already exists" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    app.get("/users", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send(user);
    });

    app.get("/", async (req, res) => {
      const result = await corpsCollection
        .find()
        .sort({ createdAt: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });

    app.get("/all-crops", async (req, res) => {
      const email = req.query.email;
      // console.log(email);

      let query = {};
      if (email) {
        query = { "owner.ownerEmail": email };
      }
      // console.log(query);

      const result = await corpsCollection.find(query).toArray();
      res.send(result);
      // console.log(result);
    });
    app.get("/search", async (req, res) => {
      const search_text = req.query.search;
      const result = await corpsCollection
        .find({ name: { $regex: search_text, $options: "i" } })
        .toArray();
      res.send(result);
    });

    app.patch("/crops/:id", async (req, res) => {
      const id = req.params.id;
      const updatedCrop = req.body;
      const filter = { _id: new ObjectId(id) };
      const update = {
        $set: {
          name: updatedCrop.name,
          type: updatedCrop.type,
          pricePerUnit: updatedCrop.pricePerUnit,
          unit: updatedCrop.unit,
          quantity: updatedCrop.quantity,
          description: updatedCrop.description,
          location: updatedCrop.location,
          image: updatedCrop.image,
        },
      };
      const result = await corpsCollection.updateOne(filter, update);
      res.send(result);
    });

    //for interest
    app.post("/crops/:id/interests", async (req, res) => {
      const id = req.params.id;
      // console.log(id);

      if (!ObjectId.isValid(id))
        return res.status(400).send({ error: "Invalid crop id" });
      const { userEmail, userName, quantity, message, totalPrice } = req.body;
      const interestId = new ObjectId();
      const interest = {
        _id: interestId,
        userEmail,
        userName,
        quantity,
        message,
        totalPrice,
        createdAt: new Date(),
        status: "pending",
      };
      // console.log(interest);
      const updatedResult = await corpsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $push: { interests: interest } }
      );

      if (updatedResult.modifiedCount === 0) {
        return res.status(404).send({ error: "Crop not found" });
      }
      const cropData = await corpsCollection.findOne({ _id: new ObjectId(id) });

      const interestRecord = {
        ...interest,
        cropName: cropData.name,
        location: cropData.location,
        ownerName: cropData.owner.ownerName,
        ownerEmail: cropData.owner.ownerEmail,
        cropId: id,
      };

      const result = await interestsCollection.insertOne(interestRecord);
      res.send({ interestId: interestId, result });
    });

    app.patch("/corps/:cropId/interest/:interestId", async (req, res) => {
      try {
        const { cropId, interestId } = req.params;
        const { status } = req.body;
        // validate
        if (!["accepted", "rejected", "pending"].includes(status)) {
          return res.status(400).send({ error: "Invalid status value" });
        }

        if (!ObjectId.isValid(cropId) || !ObjectId.isValid(interestId)) {
          return res.status(400).send({ error: "Invalid id(s)" });
        }

        const cropObjectId = new ObjectId(cropId);
        const interestObjectId = new ObjectId(interestId);

        // Atomically set the status of the matching interest (positional $)
        const updateResult = await corpsCollection.updateOne(
          { _id: cropObjectId, "interests._id": interestObjectId },
          { $set: { "interests.$.status": status } }
        );

        const updateOnInterest = {
          $set: {
            status,
          },
        };

        const result = await interestsCollection.updateOne(
          { _id: interestObjectId },
          updateOnInterest
        );
        res.send({ success: true, result, updateResult });
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Server error" });
      }
    });

    app.delete("/crops/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await corpsCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/crops/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await corpsCollection.findOne(query);
      res.send(result);
    });

    app.post("/crops", async (req, res) => {
      const newCorp = req.body;
      const result = await corpsCollection.insertOne(newCorp);
      res.send(result);
    });

    // app.get("/my-interests",async(req,res)=>{
    //   const email = req.query.email;
    //   let query = {};
    //   if(email){
    //     query={userEmail:email};
    //   }
    //   const result = await interestsCollection.find(query).toArray();
    //   res.send(result);
    // })
    app.get("/my-interests/price-high-to-low", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { userEmail: email };
      }
      const result = await interestsCollection
        .find(query)
        .sort({ totalPrice: -1 })
        .toArray();
      res.send(result);
    });
    app.get("/my-interests/price-low-to-high", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { userEmail: email };
      }
      const result = await interestsCollection
        .find(query)
        .sort({ totalPrice: +1 })
        .toArray();
      res.send(result);
    });
    app.get("/my-interests/oldest", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { userEmail: email };
      }
      const result = await interestsCollection
        .find(query)
        .sort({ createdAt: +1 })
        .toArray();
      res.send(result);
    });
    app.get("/my-interests/newest", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { userEmail: email };
      }
      const result = await interestsCollection
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
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
