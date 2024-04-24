const express = require('express')
const router = express.Router()

router.get('/', (req,res)=>{
    res.send("Stocks")
})

module.exports = router