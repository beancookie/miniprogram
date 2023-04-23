const utils = require('utils.js')

Component({
  properties: {
  },
  data: {
    devices: [],
    connected: false,
    chs: [],
  },
  methods: {
    getBLEDeviceCharacteristics(deviceId, serviceId) {
      wx.getBLEDeviceCharacteristics({
        deviceId,
        serviceId,
        success: (res) => {
          console.log('getBLEDeviceCharacteristics success', res.characteristics)
          for (let i = 0; i < res.characteristics.length; i++) {
            const item = res.characteristics[i]
            if (item.properties.read) {
              wx.readBLECharacteristicValue({
                deviceId,
                serviceId,
                characteristicId: item.uuid,
              })
            }
            if (item.properties.write) {
              this.setData({
                canWrite: true
              })
              this._deviceId = deviceId
              this._serviceId = serviceId
              this._characteristicId = item.uuid
              this.writeBLECharacteristicValue()
            }
            if (item.properties.notify || item.properties.indicate) {
              wx.notifyBLECharacteristicValueChange({
                deviceId,
                serviceId,
                characteristicId: item.uuid,
                state: true,
              })
            }
          }
        },
        fail(res) {
          console.error('getBLEDeviceCharacteristics', res)
        }
      })
      // 操作之前先监听，保证第一时间获取数据
      wx.onBLECharacteristicValueChange((characteristic) => {
        const idx = utils.inArray(this.data.chs, 'uuid', characteristic.characteristicId)
        const data = {}
        if (idx === -1) {
          data[`chs[${this.data.chs.length}]`] = {
            uuid: characteristic.characteristicId,
            value: utils.ab2hex(characteristic.value)
          }
        } else {
          data[`chs[${idx}]`] = {
            uuid: characteristic.characteristicId,
            value: utils.ab2hex(characteristic.value)
          }
        }
        this.setData(data)
      })
    },
    getBLEDeviceServices(deviceId) {
      wx.getBLEDeviceServices({
        deviceId,
        success: (res) => {
          for (let i = 0; i < res.services.length; i++) {
            if (res.services[i].isPrimary) {
              this.getBLEDeviceCharacteristics(deviceId, res.services[i].uuid)
              return
            }
          }
        }
      })
    },
    onBluetoothDeviceFound() {
      wx.onBluetoothDeviceFound((res) => {
        res.devices.forEach(device => {
          console.log(device)
          const deviceId = device.deviceId
          const name = device.name
          // todo 需要改成从H5页面传回的终端SN
          if (name === 'SD1.0_74D285567DFD') {
            wx.createBLEConnection({
              deviceId,
              success: (res) => {
                console.log(res)
                this.setData({
                  connected: true,
                  name,
                  deviceId,
                })
                this.getBLEDeviceServices(deviceId)
              }
            })
            wx.stopBluetoothDevicesDiscovery()
            throw new Error('End Of The Scan')
          }
        })
      })
    },
    startBluetoothDevicesDiscovery() {
      if (this._discoveryStarted) {
        return
      }
      this._discoveryStarted = true
      wx.startBluetoothDevicesDiscovery({
        allowDuplicatesKey: true,
        success: (res) => {
          console.log('startBluetoothDevicesDiscovery success', res)
          this.onBluetoothDeviceFound()
        },
      })
    },
    onBindmessage(e) {
      console.log(e.detail)
      wx.openBluetoothAdapter({
        success: (res) => {
          console.log('openBluetoothAdapter success', res)
          this.startBluetoothDevicesDiscovery()
        },
        fail: (res) => {
          console.log(res)
          if (res.errCode === 10001) {
            wx.onBluetoothAdapterStateChange(function (res) {
              console.log('onBluetoothAdapterStateChange', res)
              if (res.available) {
                this.startBluetoothDevicesDiscovery()
              }
            })
          }
        }
      })
    },
    onBindload() {
      console.log('onBindload')
    }
  }
})
