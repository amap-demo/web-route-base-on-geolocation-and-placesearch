 //地理编码插件，用于通过坐标获取地址信息
 var geocoder = new AMap.Geocoder();

 //添加定位组件，用于获取用户当前的精确位置
 var geolocation = new AMap.Geolocation({
 	showCircle: false, //不显示定位结果的圆
 	showMarker: false, //不现实定位结果的标记
 	showButton: false, //不现实组件的定位按钮
 	timeout: 5000 //浏览器定位超时时间5s
 });
 map.addControl(geolocation);

 //body onload时调用
 var startLocate = function() {
 	document.getElementById('locating').style.display = 'block';
 	geolocation.getCurrentPosition(function(status, result) {
 		if (status == 'complete') {
 			onLocateSuccess(result) //定位成功
 		} else if (status == 'error') {
 			//定位失败
 			if (result.message.indexOf('Geolocation permission denied.') !== -1) {
 				//Geolocation permission denied.表示用户禁用了浏览器或者APP的定位权限或者关闭了手机的定为服务
 				//或者当前页面为非安全页面,Chrome或者IOS10等系统会禁用非安全页面的定位请求，如果您的页面还没有支持HTTPS请尽快升级
 				//安全页面指的是支持HTTPS的Web站点，而且是通过https协议打开的页面。安全页面也包括本地页面
 				showTip('您好，请在系统的隐私设置中打开当前应用的定位权限。');
 			} else {
 				showTip('无法获取精确位置,将定位您所在的城市。');
 			}
 			onLocateFailed();
 		}
 	})
 };
 //信息显示
 var infoDiv = document.getElementsByClassName('info')[0];
 var showTip = function(text) {
 	infoDiv.innerHTML = text;
 	infoDiv.className = 'info top showOnce'
 }

 //起始位置
 var origin = document.getElementById('origin');
 //目的地
 var destination = document.getElementById('destination');
 var showOriginAddress = function(address) {
 	origin.innerHTML = address
 };
 var showDestinationAddress = function(address) {
 	destination.innerHTML = address;
 };

 //定位失败之后进行城市定位
 var onLocateFailed = function() {
 	geolocation.getCityInfo(function(status, result) {
 		map.setZoom(14);
 		showLocation(result.center); //在城市中心点显示起始marker
 		placeSearch.setCity(result.citycode);
 		autoComplete.setCity(result.citycode);
 	})
 };
 //定位成功
 var onLocateSuccess = function(result) {
 	showTip('定位成功,拖动地图可微调.');
 	showLocation(result.position); //在定位结果显示起始marker
 	var city = result.addressComponent.city;
 	var province = result.addressComponent.province;
 	var district = result.addressComponent.district;
 	var township = result.addressComponent.township;
 	showOriginAddress(result.formattedAddress.replace(province, '').replace(city, '').replace(district, '').replace(township, ''))
 	origin.position = result.position;
 	placeSearch.setCity(result.addressComponent.citycode);
 	autoComplete.setCity(result.addressComponent.citycode);
 };

 //显示起始marker，并开启拖拽调整起始位置的功能
 var showLocation = function(position) {
 	document.getElementById('locating').style.display = 'none';
 	startMarker.setPosition(position);
 	startMarker.show();
 	startMarker.setMap(map);
 	map.setCenter(position);
 	startAdjustOrigin(); //开启拖拽地图调整定位点
 	enableSearch(); //定位有结果之后才允许搜索
 }

 //自定义控件，用于进行定位位置的微调
 var content = document.createElement('div');
 content.innerHTML = "<img src='./images/starts.png'>";
 content.className = 'customControl';
 var customControl = { //自定义控件，需要实现addTo和removeFrom两个方法
 	dom: content,
 	addTo: function() {
 		map.getContainer().appendChild(customControl.dom);
 	},
 	removeFrom: function() {
 		if (customControl.dom.parentNode == map.getContainer()) {
 			map.getContainer().removeChild(customControl.dom);
 		}

 	}
 }

 //拖拽开始的时候添加控件，隐藏起始marker，注册拖拽结束事件
 var onMapDragStart = function() {
 	startMarker.hide();
 	map.addControl(customControl);
 	map.on('moveend', onMapMoveEnd);
 };
 //拖拽结束的时候，把起始点设置为地图中心，并使用逆地理编码接口获取当前位置的地址信息
 var onMapMoveEnd = function() {
 	map.removeControl(customControl);
 	startMarker.setPosition(map.getCenter());
 	startMarker.show();
 	var position = map.getCenter();
 	geocoder.getAddress(position, function(status, result) { //逆地理编码,根据经纬度获取地址信息
 		result = result.regeocode;
 		var city = result.addressComponent.city;
 		var province = result.addressComponent.province;
 		var district = result.addressComponent.district;
 		var township = result.addressComponent.township;
 		showOriginAddress(result.formattedAddress.replace(province, '').replace(city, '').replace(district, '').replace(township, ''))
 		origin.position = position;
 		placeSearch.setCity(result.addressComponent.citycode);
 		autoComplete.setCity(result.addressComponent.citycode);
 	})
 };

 var startAdjustOrigin = function() {
 	map.on('dragstart', onMapDragStart);
 }
 var stopAdjustOrigin = function() {
 	map.off('dragstart', onMapDragStart);
 	map.off('moveend', onMapMoveEnd);
 }