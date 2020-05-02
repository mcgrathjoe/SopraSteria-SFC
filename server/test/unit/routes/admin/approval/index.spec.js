const expect = require('chai').expect;
const sinon = require('sinon');
const util = require('util')
// To console.log a deep object:
// console.log("*************************** json: " + util.inspect(json, false, null, true));

const models = require('../../../../../models/index');

const approval = require('../../../../../routes/admin/approval');

var workplaceWithDuplicateId = null;

var testWorkplace = {};
const initialiseTestWorkplace = () => {
  testWorkplace.id = 4321;
  testWorkplace.nmdsId = 'W1234567';
  testWorkplace.ustatus = 'PENDING';
  testWorkplace.update = (args) => { return true; };
  testWorkplace.destroy = () => {return true;}
};

var testUser = {};
const initialiseTestUser = () => {
  testUser.id = 1234;
  testUser.establishment = testWorkplace;
  testUser.destroy = () => { return true; };
};

var testLogin = {};
const initialiseTestLogin = () => {
  testLogin.id = testUser.id;
  testLogin.username = 'pickle-pop-panda';
  testLogin.isActive = false;
  testLogin.status = 'PENDING';
  testLogin.user = testUser;
  testLogin.update = (args) => { return true; };
};

var testRequestBody = {};
const initialiseTestRequestBody = () => {
  testRequestBody.username = testLogin.username;
  testRequestBody.approve = true;
  testRequestBody.establishmentId = testWorkplace.id;
  testRequestBody.nmdsId = testWorkplace.nmdsId;
};

sinon.stub(models.login, 'findOne').callsFake(async (args) => {
  if (args.where.username[models.Sequelize.Op.iLike] === testLogin.username) {
    return testLogin;
  } else {
    return null;
  }
});

sinon.stub(models.user, 'findOne').callsFake(async (args) => {
  if (args.where.id === testUser.id) {
    return testUser;
  } else {
    return null;
  }
});

sinon.stub(models.establishment, 'findOne').callsFake(async (args) => {
  if (args.where.id === testWorkplace.id) {
    return testWorkplace;
  } else if ((args.where.id[Sequelize.Op.ne] === testWorkplace.id)
            && (args.where.nmdsId === testWorkplace.nmdsId)) {
    return workplaceWithDuplicateId;
  } else {
    return null;
  }
});

var returnedJson = null;
var returnedStatus = null;
const approvalJson = (json) => { returnedJson = json; };
const approvalStatus = (status) => {
  returnedStatus = status;
  return {json: approvalJson, send: () => {} };
};

describe('admin/Approval route', () => {

  beforeEach(async() => {
    workplaceWithDuplicateId = null;
    initialiseTestWorkplace();
    initialiseTestUser();
    initialiseTestLogin();
    initialiseTestRequestBody();
    returnedJson = null;
    returnedStatus = null;
  });

  describe('approving a new user', () => {
    it('should return a confirmation message and status 200 when the user is approved', async() => {
      // Arrange
      testRequestBody.approve = true;

      // Act
      await approval.adminApproval({
        body: testRequestBody
      }, {status: approvalStatus});

      // Assert
      expect(typeof(returnedJson)).to.deep.equal('object');
      expect(returnedJson.status).to.deep.equal('0');
      expect(returnedJson.message).to.deep.equal('User has been set as active');
      expect(returnedStatus).to.deep.equal(200);
    });
    
    it('should mark the login as active when approving a new user', async () => {
      // Arrange 
      testRequestBody.approve = true;
      var loginIsActive = false;
      testLogin.update = (args) => {
        loginIsActive = args.isActive;
        return true;
      }

      // Act
      await approval.adminApproval({
        body: testRequestBody
      }, {status: approvalStatus});

      // Assert
      expect(loginIsActive).to.deep.equal(true);
    });
    
    it('should remove the pending status from the login when approving a new user', async () => {
      // Arrange 
      testRequestBody.approve = true;
      var loginStatus = 'PENDING';
      testLogin.update =  (args) => {
        loginStatus = args.status;
        return true;
      }

      // Act
      await approval.adminApproval({
        body: testRequestBody
      }, {status: approvalStatus});

      // Assert
      expect(loginStatus).to.deep.equal(null);
    });
    
    it('should not approve a new user that does not have a login with matching username', async () => {
      // Arrange 
      testRequestBody.approve = true;
      testRequestBody.username = 'no matching login available';
      var loginUpdated = false;
      testLogin.update =  (args) => {
        loginUpdated = true;
        return true;
      }

      // Act
      await approval.adminApproval({
        body: testRequestBody
      }, {status: approvalStatus});
      
      // Assert
      expect(loginUpdated).to.equal(false);
    });

    it('should return status 400 if there is no login with matching username', async () => {
      // Arrange 
      testRequestBody.approve = true;
      testRequestBody.username = 'no matching login available';

      // Act
      await approval.adminApproval({
        body: testRequestBody
      }, {status: approvalStatus});

      // Assert
      expect(returnedStatus).to.deep.equal(400);
    });
    
    it('should return status 400 and error msg if there is workplace with duplicate workplace id when approving new user', async () => {
      // Arrange 
      testRequestBody.approve = true;
      workplaceWithDuplicateId = { nmdsId: testWorkplace.nmdsId };

      // Act
      await approval.adminApproval({
        body: testRequestBody
      }, {status: approvalStatus});

      // Assert
      expect(typeof(returnedJson)).to.deep.equal('object');
      expect(returnedJson.nmdsId).to.not.equal(undefined);
      expect(returnedJson.nmdsId).to.deep.equal(`This workplace ID (${testWorkplace.nmdsId}) belongs to another workplace. Enter a different workplace ID.`);
      expect(returnedStatus).to.deep.equal(400);
    });
    
    it('should NOT update the login when approving a new user with duplicate workplace Id', async () => {
      // Arrange 
      testRequestBody.approve = true;
      workplaceWithDuplicateId = { nmdsId: testWorkplace.nmdsId };
      var loginUpdated = false;
      testLogin.update =  (args) => {
        loginUpdated = true;
        return true;
      }

      // Act
      await approval.adminApproval({
        body: testRequestBody
      }, {status: approvalStatus});
      
      // Assert
      expect(loginUpdated).to.equal(false);
    });
    
    it('should NOT remove the pending status from the workplace when approving a new user with duplicate workplace Id', async () => {
      // Arrange 
      testRequestBody.approve = true;
      workplaceWithDuplicateId = { nmdsId: testWorkplace.nmdsId };
      var workplaceUpdated = false;
      testWorkplace.update =  (args) => {
        workplaceUpdated = true;
        return true;
      }

      // Act
      await approval.adminApproval({
        body: testRequestBody
      }, {status: approvalStatus});
      
      // Assert
      expect(workplaceUpdated).to.equal(false);
    });
    
    it('should return status 503 if user update returns false when approving a new user', async () => {
      // Arrange 
      testRequestBody.approve = true;
      testWorkplace.update = () => { return false; }

      // Act
      await approval.adminApproval({
        body: testRequestBody
      }, {status: approvalStatus});

      // Assert
      expect(returnedStatus).to.deep.equal(503);
    });

    //it('should return status 503 if workplace update returns false when approving a new user', async () => {
    //it('should return status 503 if user update throws exception when approving a new user', async () => {
    //it('should return status 503 if workplace update throws exception when approving a new user', async () => {
  });

  describe('rejecting a new user', () => {
    //it('!!! Write front end tests for the scenarios about duplicate workplace id when approving new user!!!', async () => {
    //it('should return a confirmation message and status 200 when the user is removed because the user is rejected', async () => {
    //it('should delete the user and workplace when rejecting a new user', async () => {
    //it('!! Why doesn't it delete the login?', async () => {
    //it('!!! Currently it will delete the login if it can't find as associated establishment. I'm not sure this would ever actually happen but doesn't seem right? Further investigation could be a big time sink for no good reason though. !!!', async () => {
    //it('!!! There's also no action taken if it can't find an associated user record? !!!', async () => {
    //it('should not reject a new user that does not have an associated user', async () => {
    //it('should not reject a new user that does not have an associated workplace', async () => {
    //it('should return status 503 if it is not possible to delete a user when rejecting a new user', async () => {
    //it('should return status 503 if it is not possible to delete a workplace when rejecting a new user', async () => {
  });

  describe('approving a new workplace', () => {
    //it('should return a confirmation message and status 200 when the workplace is approved', async () => {
    //it('should remove the pending status from the workplace when approving a new workplace', async () => {
    //it('should return status 400 and error msg if there is workplace with duplicate workplace id when approving new workplace', async () => {
    //it('should NOT remove the pending status from the workplace when approving a new workplace with duplicate workplace Id', async () => {
    //it('should NOT remove the pending status from the workplace when approving a new workplace with duplicate workplace Id', async () => {
    //it('should return status 503 if workplace update returns false when approving a new user', async () => {
    //it('should return status 503 if workplace update throws exception when approving a new user', async () => {
  });

  describe('rejecting a new workplace', () => {
    //it('should return a confirmation message and status 200 when the workplace is removed because the workplace is rejected', async () => {
    //it('should delete the workplace when rejecting a new workplace', async () => {
    //it('should return status 503 if it is not possible to delete a workplace when rejecting a new workplace', async () => {
  });
});
