const Developer = require('../models/Developer');
const User = require('../models/User');

// @desc    Get all developer profiles
// @route   GET /api/developers
// @access  Public / Private
const getDevelopers = async (req, res) => {
  try {
    let developers = await Developer.find().populate('user', 'email role profileImage');
    
    // If no developer profile exists yet, trigger auto-creation
    if (developers.length === 0) {
      await seedDeveloperAccount();
      developers = await Developer.find().populate('user', 'email role profileImage');
    }

    res.status(200).json({ success: true, count: developers.length, data: developers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update developer details
// @route   PUT /api/developers/:id
// @access  Private (Developer or Admin)
const updateDeveloper = async (req, res) => {
  try {
    const { name, roleTitle, profileImage, message } = req.body;

    let dev = await Developer.findById(req.params.id);
    if (!dev) {
      return res.status(404).json({ success: false, message: 'Developer record not found' });
    }

    // Check authorization: must be developer or admin
    if (req.user.role !== 'developer' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access Denied: Only developers can update developer details.' });
    }

    dev.name = name !== undefined ? name : dev.name;
    dev.roleTitle = roleTitle !== undefined ? roleTitle : dev.roleTitle;
    dev.profileImage = profileImage !== undefined ? profileImage : dev.profileImage;
    dev.message = message !== undefined ? message : dev.message;

    await dev.save();

    // Sync User schema if linked
    if (dev.user) {
      const userObj = await User.findById(dev.user);
      if (userObj) {
        if (name) userObj.name = name;
        if (profileImage !== undefined) userObj.profileImage = profileImage;
        await userObj.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Developer details updated successfully',
      data: dev,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add a new developer profile & account
// @route   POST /api/developers
// @access  Private (Developer or Admin)
const createDeveloper = async (req, res) => {
  try {
    const { name, email, password, roleTitle, profileImage, message } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Developer name is required' });
    }

    let userId = null;
    if (email && password) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ success: false, message: 'Email address already registered' });
      }

      const devUser = await User.create({
        name,
        email,
        password,
        role: 'developer',
        profileImage: profileImage || '',
      });
      userId = devUser._id;
    }

    const dev = await Developer.create({
      user: userId,
      name,
      roleTitle: roleTitle || 'Software Engineer / Developer',
      profileImage: profileImage || '',
      message: message || 'Hello! Contributed to the design & engineering of EduSphere.',
    });

    res.status(201).json({
      success: true,
      message: 'New Developer added successfully',
      data: dev,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a developer profile
// @route   DELETE /api/developers/:id
// @access  Private (Developer or Admin)
const deleteDeveloper = async (req, res) => {
  try {
    const dev = await Developer.findById(req.params.id);
    if (!dev) {
      return res.status(404).json({ success: false, message: 'Developer record not found' });
    }

    // Protect primary default developer shivam from deletion
    if (dev.user) {
      const u = await User.findById(dev.user);
      if (u && u.email === 'developershivam@gmail.com') {
        return res.status(400).json({
          success: false,
          message: 'Action Denied: Primary developer Shivam account is protected from deletion.',
        });
      }
      await User.findByIdAndDelete(dev.user);
    }

    await dev.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Seed Developer login credentials and profile on boot
const seedDeveloperAccount = async () => {
  try {
    const devEmail = 'developershivam@gmail.com';
    const devPass = 'developershivam';

    let devUser = await User.findOne({ email: devEmail });
    if (!devUser) {
      devUser = await User.create({
        name: 'Shivam (Developer)',
        email: devEmail,
        password: devPass,
        role: 'developer',
      });
      console.log('✅ Developer login account created: developershivam@gmail.com');
    } else {
      // Force sync password and role to ensure valid credentials match
      devUser.name = 'Shivam (Developer)';
      devUser.password = devPass;
      devUser.role = 'developer';
      await devUser.save();
    }

    let devProfile = await Developer.findOne({ $or: [{ user: devUser._id }, { name: 'Shivam (Developer)' }] });
    if (!devProfile) {
      devProfile = await Developer.create({
        user: devUser._id,
        name: 'Shivam (Developer)',
        roleTitle: 'Lead Full-Stack Developer',
        profileImage: devUser.profileImage || '',
        message: 'Welcome to EduSphere! Built with passion, clean architecture, and modern full-stack web technology stack. Feel free to reach out!',
      });
      console.log('✅ Developer profile record created');
    } else if (!devProfile.user) {
      devProfile.user = devUser._id;
      await devProfile.save();
    }
  } catch (err) {
    console.error('Error seeding developer account:', err.message);
  }
};

module.exports = {
  getDevelopers,
  createDeveloper,
  updateDeveloper,
  deleteDeveloper,
  seedDeveloperAccount,
};
