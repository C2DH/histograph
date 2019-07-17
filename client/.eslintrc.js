module.exports = {
    "extends": ["airbnb-base"],
    "parserOptions": {
        "ecmaVersion": 2017,
    },
    "env": {
    },
    "plugins": [],
    "rules": {
        "semi": "off",
        "no-underscore-dangle": "off",
        "arrow-parens": "off",
        "comma-dangle": "off",
        "class-methods-use-this": "off",
        "func-names": "off",
        "prefer-arrow-callback": "off",
    },
    "globals": {
        "angular": "readonly",
        "moment": "readonly",
        "_": "readonly"
    }
}
