const jwt = require('jsonwebtoken')

const generateToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || "7d",
      issuer: "school-management-system",
      audience: "school-users",
    });
};

const verifyToken = (token) =>{
    try {
        return jwt.verify(token, process.env.JWT_SECRET, {
          issuer: "school-management-system",
          audience: "school-users",
        });
    } catch (error) {
        throw new Error("Invalid or expired token");
    }
};


const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "30d",
    issuer: "school-management-system",
    audience: "school-users",
  });
};


const extractTokenFromHeader = (authHeader) => {
    if(!authHeader){
      throw new Error("No authorization header provided");
    }

    if(!authHeader.startsWith('Bearer ')){
        throw new Error("Invalid authorization header format");
    }

    return authHeader.substring(7);
};

const createTokenResponse = (user) => {
    const tokenPayload = {
        id:user._id,
        email:user.email,
        role:user.email,
        name:user.name
    };

    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken({id : user._id})

    return {
      token,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRE || "7d",
      tokenType: "Bearer",
    };
};


module.exports  = {
    generateToken,
    verifyToken,
    generateRefreshToken,
    extractTokenFromHeader,
    createTokenResponse
}
