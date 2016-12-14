# JavaScriptAPI-Geolocation-PlaceSearch-Driving
一个基于高德地图JSAPI开发的移动端示例，模拟了如下场景：通过定位获取用户当前位置，定位成功后可以进行位置微调，定位失败的话可以通过搜索让用户选择当前位置；然后通过搜索让用户选择目的地，在当前位置和目的地都取得之后，进行从当前位置到目的地的路线规划。

##体验地址

##预览图

##场景实现思路:
  首先，通过Geoocation定位组件的getCurrentPosition接口获得用户当前的准确位置，如果定位成功则把获取到的精确位置标记为起点位置，如果定位失败则通过Geolocation的getCityInfo方法获取用户所在的城市信息后把城市中心点标记为起点位置；

  然后，标记完成之后打开起点位置的微调功能，微调的功能使用自定义控件的方式来实现，在地图的中心点添加一个和起点样式一致的点状图片，这样地图拖拽的时候，这个点就不会随着地图移动，拖拽结束之后把这个控件移除，并把起点标记的位置设置为地图中心点即可，拖拽结束获取到的经纬度，可以使用Geocoder的getAddress方法获取到具体的地址信；

  接着，利用Autocomplete输入提示组件和PlaceSearch搜索组件实现一个选择POI的功能。用户可以通过这个POI选择界面获取到自己所在的位置，以及目的地的位置；

  最后，在当前位置和目的地确定之后，使用Driving驾车路线规划组件进行出行线路的规划。

##实现过程
###1.JSAPI及相关组件的加载
使用JSAPI开发Web应用时，需要将JSAPI的入口文件引用到页面内，如果需要同时加载某些插件，可以在JSAPI的引用中添加plugin参数：

    <script type="text/javascript" src='http://webapi.amap.com/maps?v=1.3&plugin=AMap.Geolocation,AMap.ToolBar,AMap.Geocoder,AMap.PlaceSearch,AMap.Autocomplete,AMap.Driving&key=e07ffdf58c8e8672037bef0d6cae7d4a'></script>
###2.页面布局
首先通过html和css实现一个左右布局的单页面，左右各一个界面，左侧界面用于展示地图、定位结果调整、起点终点显示和路线规划结果展示，右侧页面用于实现地点选择功能，包括输入提示框和POI搜索结果展示面板。代码中showLeftView和showRightView用来实现左右两个界面的切换。
###3.定位功能的实现
定位主要用到了Geolocation组件，这个组件有两个常用方法，一个是getCurrentPosition方法用来获取用户的准确位置，一个是getCityInfo方法，用来获取用户所在的城市信息。我们首先通过getCurrentPosition获取用户的准确位置，如果获取不到再使用getCityInfo方法获取用户所在的城市信息。获取到的精确定位位置或者城市中心位置将作为初始确定的起点位置：

	 //添加定位组件，用于获取用户当前的精确位置
	 var geolocation = new AMap.Geolocation({
	 	showCircle: false, //不显示定位结果的圆
	 	showMarker: false, //不现实定位结果的标记
	 	showButton: false, //不现实组件的定位按钮
	 	timeout: 5000 //浏览器定位超时时间5s
	 });
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
###4.拖拽地图调整起点位置的实现
首先创建一个自定义的控件，JSAPI的自定义控件只需要实现addTo和removeFrom两个方法即可。这个自定义控件的功能很简单，就是在地图中心显示一个和起点标记完全一样的图片。

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

然后在需要调整时給地图绑定dragstart和moveend事件，dragstart的事件回调中隐藏起点Marker、添加自定义控件，moveend的事件回调用移除自定义空间，设置起点marker的位置，并进行逆地理编码获取新位置的地址信息：

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
###5.搜索选点功能的实现
搜索选点用到了两个组件，一个是Autocomplete输入提示组件，给它指定input元素，在其中输入文字的时候就会自动显示相关的提示地点；另一个是PlaceSearch组件，为它设定panel属性，在调用search后，返回的数据将会自动展示在panel制定的div中.

	//输入提示组件，在searchInput输入文字后，将自动显示相关的地点提示
	var autoComplete = new AMap.Autocomplete({
		input: searchInput,
		citylimit: true,
		noshowDistrict: true
	});
	//POI搜索组件，用来根据输入框中的值搜索相关的POI信息
	var placeSearch = new AMap.PlaceSearch({
		panel: 'searchResult',
		pageSize: 8,
		radius: 10000,
		citylimit: true
	});

我们在打开搜索界面的时候为給输入提示组件绑定select事件，当有提示项被点击选择的时候将执行事件回调，在事件回调中，我们调用PlaceSearch的search方法，关键字搜索，搜索结果自动显示在#searchResult结果div中。同时给placeSearch绑定一个listElementClick事件，当结果列表中有任一元素被点击的时候将执行事件回调，在事件回调中，我们执行POI选中的回调操作，并将界面切换到地图界面

	//点击起点或者终点输入框的时候打开搜索界面，在搜索结果点击选择任一POI的时候执行onSelectCallback回调
	var onInputClick = function(initText, onSelectCallback) {
		if (initText !== '你的位置' && initText !== '你要去哪儿') {
			searchInput.value = initText;
		} else {
			searchInput.value = '';
		}
		showRightView(); //打开搜索界面
		//当在输入提示结果列表选中一个之后，触发POI搜索的关键字搜索
		autoComplete.selectHandler = AMap.event.addListener(autoComplete, 'select', function(e) {
			placeSearch.search(e.poi.name)
		});
		//当在POI搜索结果列表选中一个之后，触发onSelectCallback选中回调
		placeSearch.listElementClickHandler = AMap.event.addListener(placeSearch, 'listElementClick', function(e) {
			onSelectCallback(e.data);
			showLeftView();
		})

	};

onSelectCallback为我们在打开搜索界面时传入的回调函数，点击起点和终点分别传了不同的回调onOriginSelected和onDestinationSelected：

	//从搜索结果点击选择一个POI之后执行，设置起点位置为POI的位置
	var onOriginSelected = function(poi) {
		origin.position = poi.entr_location || poi.location;
		origin.innerHTML = poi.name;
		startMarker.setPosition(origin.position);
		if (destination.position) {
			driving.search(origin.position, destination.position)
		} else {
			map.setFitView();
			startAdjustOrigin();
		}

	};
	//从搜索结果点击选择一个POI之后执行，设置终点位置为POI的位置
	var onDestinationSelected = function(poi) {
		destination.position = poi.entr_location || poi.location;
		destination.innerHTML = poi.name;
		endMarker.setMap(map);
		endMarker.setPosition(destination.position);
		if (origin.position && destination.position) {
			driving.search(origin.position, destination.position)
		}
	};
	//定位结束后执行，启用搜索
	var enableSearch = function() {
		//点击起点输入的时候,打开搜索界面
		AMap.event.addDomListener(origin, 'click', function(e) {
			stopAdjustOrigin();
			if (origin.innerHTML !== '你的位置') {
				//如果已经有起始位置，搜索页面打开默认显示定位位置的周边搜索结果
				placeSearch.searchNearBy('', origin.position);
			}
			onInputClick(origin.innerHTML, onOriginSelected)
		});
		//点击终点输入的时候,打开搜索界面
		AMap.event.addDomListener(destination, 'click', function() {
			stopAdjustOrigin();
			if (destination.innerHTML !== '你要去哪儿') {
				//如果已经有目的地，搜索页面打开默认显示目的地的周边搜索结果
				placeSearch.searchNearBy('', destination.position);
			}
			onInputClick(destination.innerHTML, onDestinationSelected)
		});
	}
###6.驾车路线规划的实现
驾车路线规划需要使用Driving组件，因为已经自己创建了起终点的标记Marker，所以我们设置了hideMarkers隐藏组件自己的起终点标记，传入了map属性之后，路线规划的结果将自动显示在地图对象上。然后在onOriginSelected和onDestinationSelected函数中先判断是否起终点的位置都有了，都有了之后调用driving的search方法就可以了：

 	//创建驾车路线规划组件
    var driving = new AMap.Driving({
        map:map,
        hideMarkers:true
    });

    if (origin.position && destination.position) {
		driving.search(origin.position, destination.position)
	}
##其他说明

####关于JSAPI的开发者key：
   开发者key是开发者在使用JSAPI开发地图应用时必须填写的一串字符，只有使用了正确有效的key才能保证所有的功能和服务接口正常工作。本示例没有填写有效的开发者key，为使涉及到服务的相关示例能够正常运行，首先需要注册高德地图开发者账号，然后申请JSAPI的开发者key,并替换index.html中的‘您申请的key值’为申请的key。

####JSAPI开发者key的申请地址：

[http://lbs.amap.com/](http://lbs.amap.com),点击打开左侧链接之后，在页面右上角注册开发者账号后即可申请key。

####相关参考网站：

- [JSAPI 简介](http://lbs.amap.com/api/javascript-api/summary/) 

- [JSAPI 开发指南](http://lbs.amap.com/api/javascript-api/guide/create-map/show-map/)

- [JSAPI 参考手册](http://lbs.amap.com/api/javascript-api/reference/core/)

- [JSAPI 示例中心](http://lbs.amap.com/api/javascript-api/example/map/map-show/)








