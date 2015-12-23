/* 日本アルプス */
var DEFAULT_LAT = 36.289167;
var DEFAULT_LNG = 137.648056;


/**
 * アクセス時のエントリポイント
 */
function doGet(){
  var output = HtmlService.createTemplateFromFile("index");
  return output.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME);
}


/**
 * アルクマイベントの型
 */
var EventList = function(day, title, place){
  this.day = day;
  this.title = title;
  this.place = place;
}


/**
 * Google StaticMapを作成し、Urlを取得する
 */
function getMap(){
  // staticMapの設定
  var map = Maps.newStaticMap();
  // サイズは600x600強が限界
  map.setSize(700, 700);
  // 東京や大阪も活動範囲に入ってきたので、以前より一つ縮尺を小さくする
  map.setZoom(7);
  map.setCenter(DEFAULT_LAT, DEFAULT_LNG);
  map.setLanguage('ja');
  map.setMapType(Maps.StaticMap.Type.ROADMAP);
  map.setFormat(Maps.StaticMap.Format.PNG);

  // 地図上にマーカーを追加
  var events = getEvents();
  for (var i = 0; i < events.length; i++){
    var geo = getGeo(events[i].place);
    var lat = geo.lat;
    var lng = geo.lng;
    map.addMarker(lat, lng);
  }
  return map.getMapUrl();
}


/**
 * 場所の名称をもとに、Mapsクラスにて緯度・経度を取得する
 * 正しい緯度・軽度が取得できない場合は、デフォルトの緯度・経度を取得する(手抜き)
 */
function getGeo(place){
  if (place == " "){
    return {lat:DEFAULT_LAT, lng:DEFAULT_LNG};
  }

  var latlng = Maps.newGeocoder().geocode(place);
  if (latlng.status == "ZERO_RESULTS"){
    return {lat:DEFAULT_LAT, lng:DEFAULT_LNG};
  }
  return {lat: latlng.results[0].geometry.location.lat,
          lng: latlng.results[0].geometry.location.lng}
}


/**
 * アルクマスケジュールをスクレイピングし、EventListの形にして戻す
 */
function getEvents() {
  // アルクマのスケジュールにアクセス
  var response = UrlFetchApp.fetch("http://www.arukuma.jp/caravan/index.php");

  // 当月のスケジュール部分を取得
  var reg = /<div class="schedule aug">([\s\S]*?)<\/div>/i;
  var match = reg.exec(response.getContentText());
  var content = match[1];

  // 正規表現による置換で、スケジュール部分を整形してゆく  
  // 正規表現で扱いやすくするために、改行とスペースを削除
  content = content.replace(/\s/g, "")

  // 日時とイベントと場所を`|`で連結
  content = content.replace(/(<\/p>)*<\/td><td>(<p>)*/g, "|");
  
  // 場所の後の日時を`|`で連結
  content = content.replace(/<trid="[0-9]{8}"><td>|<tdid="[0-9]{8}">|<tr><td>/g, "|");
  
  // 整形できたので、いらないタグを削除
  content = content.replace(/<h4.*<\/th><\/tr>|<\/p>|<\/td>|<\/tr>|<\/table>|<tr>|<br\/>/g, "");
  
  // ここまででデータの整形が完了した
  // `|`でsplit()すると、以下の順で格納されるはず
  // 1行目：日時
  // 2行目：イベント名
  // 3行目：場所
  // 以降繰り返し
  var schedules = content.split("|");
  
  var events = [];
  // 初回ループがpushされるのを避けるため、iは1から始める
  for(var i = 1; i <= schedules.length; i++){
    if (i % 3 === 0){
      events.push(new EventList(schedules[i-2],
                                schedules[i-1],
                                schedules[i]));
    }
  }
  return events;
}
