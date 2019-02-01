// the apprenticeship training property is an enumeration
const ChangePropertyPrototype = require('../../properties/changePrototype').ChangePropertyPrototype;

const APPRENTICESHIP_TYPE = ['Yes', 'No', 'Don\'t know'];
exports.WorkerApprenticeshipTrainingProperty = class WorkerApprenticeshipTrainingProperty extends ChangePropertyPrototype {
    constructor() {
        super('ApprenticeshipTraining');
    }

    static clone() {
        return new WorkerApprenticeshipTrainingProperty();
    }

    // concrete implementations
    async restoreFromJson(document) {
        console.log("WA DEBUG - restoring Apprentice")
        if (document.apprenticeshipTraining) {
            console.log("WA DEBUG - restoring actual Apprentice: ", document.apprenticeshipTraining)
            if (APPRENTICESHIP_TYPE.includes(document.apprenticeshipTraining)) {
                console.log("WA DEBUG - restoring Apprentice is as expected")
                this.property = document.apprenticeshipTraining;
            } else {
               this.property = null;
            }
        }
        console.log("WA DEBUG - apprentice property: ", this.property)
    }

    restorePropertyFromSequelize(document) {
        return document.ApprenticeshipTrainingValue;
    }
    savePropertyToSequelize() {
        return {
            ApprenticeshipTrainingValue: this.property
        };
    }

    isEqual(currentValue, newValue) {
        // Apprenticeship Training is a simple (enum'd) string
        return currentValue && newValue && currentValue === newValue;
    }

    toJSON(withHistory=false, showPropertyHistoryOnly=true) {
        if (!withHistory) {
            // simple form
            return {
                apprenticeshipTraining: this.property
            };
        }
        
        return {
            apprenticeshipTraining : {
                currentValue: this.property,
                ... this.changePropsToJSON(showPropertyHistoryOnly)
            }
        };
    }
};