import mongoose from "mongoose";

const checkboxSchema = new mongoose.Schema({
  checkboxes: [Boolean],
});

export default mongoose.model("Checkbox", checkboxSchema);
