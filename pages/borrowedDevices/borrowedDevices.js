
const AV = require('../../utils/av-live-query-weapp-min');
const app = getApp()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    devices: [],
    showEmptyView:false,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    wx.setNavigationBarTitle({
      title: '借入设备',
    })
    this.getBorrowedDevices();
  },

  //ok
  formatDateTime: function (inputTime) {
    var date = new Date(inputTime);
    var y = date.getFullYear();
    var m = date.getMonth() + 1;
    m = m < 10 ? ('0' + m) : m;
    var d = date.getDate();
    d = d < 10 ? ('0' + d) : d;
    var h = date.getHours();
    h = h < 10 ? ('0' + h) : h;
    var minute = date.getMinutes();
    var second = date.getSeconds();
    minute = minute < 10 ? ('0' + minute) : minute;
    // second = second < 10 ? ('0' + second) : second; 
    return y + '-' + m + '-' + d + ' ' + h + ':' + minute;
  },
  //ok
  bindTapExpand: function (e) {
    var tapIndex = e.currentTarget.dataset.index;
    var devices = this.data.devices;
    var device = devices[tapIndex];
    if (!device.isExpand) {
      device.isExpand = true;
    } else {
      device.isExpand = !device.isExpand;
    }
    this.setData({
      devices: devices
    });


  },
  //ok
  bindReturnBorrowed:function(e) {
    var index = e.currentTarget.dataset.index;
    var device = this.data.devices[index];
    var that = this;
    wx.showModal({
      title: '归还设备',
      content: '你确定要归还设备 ' + device.model + " ?",
      success: function (res) {
        if (res.confirm) {
          wx.showLoading({
            title: '',
            mask: true,
          });
          that.addDevicesStatus(index, -3, {
            success: function () {
              wx.showToast({
                title: '归还提交成功，请等待\"' + device.employeeName + "\"确认",
                icon: 'none',
              });
              that.getBorrowedDevices();
            },
            fail: function () {
              wx.showToast({
                title: '归还提交失败，请稍后再试',
                icon: 'none'
              });
            }
          });
        }
      }
    })
  },

  //ok
  bindCancelBorrowed:function(e) {
      console.log('取消申请');
      var index = e.currentTarget.dataset.index;
      var device = this.data.devices[index];
      var that = this;
      wx.showModal({
        title: '取消申请',
        content: '你确定要取消申请 ' + device.model + " ?",
        success: function (res) {
          if (res.confirm) {
            wx.showLoading({
              title: '',
              mask: true,
            });
            that.addDevicesStatus(index,0, {
              success:function(){
                wx.showToast({
                  title: "取消申请成功!",
                  icon: 'success',
                });
                that.getBorrowedDevices();
              },
              fail:function(){
                wx.showToast({
                  title: '取消申请失败，请稍后再试',
                  icon: 'none'
                })
              }
            });
          }
        }
      });
  },


  addDevicesStatus: function (index, status, { success, fail }) {
    var that = this;
    var device = this.data.devices[index];
    var deviceAVObject = AV.Object.createWithoutData('Devices', device.deviceObjectID);
    var timestamp = Date.parse(new Date());
    var devicesStatusAVObject = new AV.Object('DevicesStatus');
    devicesStatusAVObject.set('status', status); //0闲置，-1 申请中，-2借出，-3归还中 -99删除
    devicesStatusAVObject.set('actionTimestamp', timestamp);//当前操作时间
    //关联借用人
    var dependentActionUserAVObject = AV.Object.createWithoutData('Users', app.globalData.employeeInfo.employeeObjectID);
    devicesStatusAVObject.set('dependentActionUser', dependentActionUserAVObject);//关联用户
    //关联设备
    devicesStatusAVObject.set('dependentDevice', deviceAVObject);///状态关联关联设备（双向关联）
    //关联状态
    deviceAVObject.set('dependentDevicesStatus', devicesStatusAVObject);
    deviceAVObject.save().then(function (result) {
      success ? success() : null;
    }, function (error) {
      fail ? fail() : null;
    });
  },

  
  // ok
  getBorrowedDevices: function () {
    var that = this;
  
    //组合加内嵌查询
    var innerQuery1 = new AV.Query('DevicesStatus');
    innerQuery1.notEqualTo('status', 0);
    var innerQuery2 = new AV.Query('DevicesStatus');
    innerQuery2.notEqualTo('status', -99);
    var innerQuery12 = AV.Query.and(innerQuery1, innerQuery2);

    var innerQuery3 = new AV.Query('DevicesStatus');
    var borrowedUser = AV.Object.createWithoutData('Users', app.globalData.employeeInfo.employeeObjectID);
    innerQuery3.equalTo('dependentActionUser', borrowedUser);
    var query = new AV.Query('Devices');

    var query123 = AV.Query.and(innerQuery12, innerQuery3);

    //执行内嵌操作
    query.matchesQuery('dependentDevicesStatus', query123);
    query.include(['dependentModel.dependent']);
    query.include(['dependentUser']);
    query.include(['dependentDevicesStatus.dependentActionUser']);

    query.find().then(function (results) {

      wx.hideNavigationBarLoading();
      wx.stopPullDownRefresh();

      if (results.length > 0) {
        var devices = [];
        results.forEach(function (item, index) {
          //设备信息
          var deviceObjectID = item.id;
          var deviceID = item.get('deviceID');
          var OSVersion = item.get('OSVersion');
          var companyCode = item.get('companyCode');
          //型号
          var modelObjectID = item.get('dependentModel') ? item.get('dependentModel').id : null;
          var model = item.get('dependentModel') ? item.get('dependentModel').get('model') : null;
          //品牌
          var brand = item.get('dependentModel') ? (item.get('dependentModel').get('dependent') ? item.get('dependentModel').get('dependent').get('brand') : null) : null;
          //状态
          var status = item.get('dependentDevicesStatus') ? item.get('dependentDevicesStatus').get('status') : null;
          var statusObjectID = item.get('dependentDevicesStatus') ? item.get('dependentDevicesStatus').id : null;

          var statusObjectID = item.get('dependentDevicesStatus') ? item.get('dependentDevicesStatus').id : null;
          var statusActionTimestamp = item.get('dependentDevicesStatus') ? item.get('dependentDevicesStatus').get('actionTimestamp') : null;

          var statusActionEmployeeObjectID = item.get('dependentDevicesStatus') ? (item.get('dependentDevicesStatus').get('dependentActionUser') ? item.get('dependentDevicesStatus').get('dependentActionUser').id : null) : null;
          var statusActionEmployeeID = item.get('dependentDevicesStatus') ? (item.get('dependentDevicesStatus').get('dependentActionUser') ? item.get('dependentDevicesStatus').get('dependentActionUser').get('employeeID') : null) : null;
          var statusActionEmployeeObjectName = item.get('dependentDevicesStatus') ? (item.get('dependentDevicesStatus').get('dependentActionUser') ? item.get('dependentDevicesStatus').get('dependentActionUser').get('employeeName') : null) : null;

          //用户信息
          var employeeObjectID = item.get('dependentUser') ? item.get('dependentUser').id : null;
          var employeeID = item.get('dependentUser') ? item.get('dependentUser').get('employeeID') : null;
          var employeeName = item.get('dependentUser') ? item.get('dependentUser').get('employeeName') : null;
          var employeeOpenID = item.get('dependentUser') ? item.get('dependentUser').get('openID') : null;
          var obj = {};
          obj.deviceObjectID = deviceObjectID;
          obj.deviceID = deviceID;
          obj.OSVersion = OSVersion;
          obj.companyCode = companyCode;
          obj.modelObjectID = modelObjectID;
          obj.model = model;
          obj.brand = brand;

          obj.status = status;
          obj.statusObjectID = statusObjectID;
          obj.statusActionTimestamp = that.formatDateTime(statusActionTimestamp);
          obj.statusActionEmployeeObjectID = statusActionEmployeeObjectID;
          obj.statusActionEmployeeID = statusActionEmployeeID;
          obj.statusActionEmployeeObjectName = statusActionEmployeeObjectName;

          obj.employeeObjectID = employeeObjectID;
          obj.employeeID = employeeID;
          obj.employeeName = employeeName;
          obj.employeeOpenID = employeeOpenID;
          devices.push(obj);
          console.log(devices);
        });
        //排序
        devices.sort(function (a, b) {
          //降序
          return b.status - a.status;
        });

        that.setData({
          showEmptyView: false,
          devices: devices
        })
      } else {
        that.setData({
          devices:[],
          showEmptyView: true,
        })
      }
    }, function (error) {
      wx.showToast({
        title: '获取设备列表失败',
        icon: 'none',
      })
    });

  },


  onPullDownRefresh: function () {
    wx.showNavigationBarLoading();
    this.getBorrowedDevices();
  },

})