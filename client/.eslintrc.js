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
        "no-param-reassign": [
            "error", 
            { 
                "props": true, 
                "ignorePropertyModificationsFor": ["scope", "$scope", "$rootScope"] 
            }
        ]
    },
    "globals": {
        "angular": "readonly",
        "moment": "readonly",
        "_": "readonly",
        "$": "readonly",
        "window": "readonly",
        "d3": "readonly"
    }
}
