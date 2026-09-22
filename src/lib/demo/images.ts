// Billed-URL'er til demo-data. Alle billeder vises via <FoodImage>, som falder
// tilbage til en flot gradient + emoji hvis et billede ikke kan indlæses.
// I produktion uploader restauranten sine egne billeder (Supabase Storage).
export const img = (id: string, w = 900) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;

export const IMAGES = {
  heroPizza: img("photo-1513104890138-7c749659a591", 1600),
  restaurantInterior: img("photo-1517248135467-4c7edcad34c4", 1600),
  fineDining: img("photo-1414235077428-338989a2e8c0", 1600),
  cozyRestaurant: img("photo-1555396273-367ea4eb4db5", 1600),
  chef: img("photo-1577219491135-ce391730fb2c", 1200),
  pizzaOven: img("photo-1579751626657-72bc17010498", 1200),
  cafe: img("photo-1501339847302-ac426a4a7cbb", 1600),
  cafeInterior: img("photo-1554118811-1e0d58224f24", 1600),
  sushiHero: img("photo-1579871494447-9811cf80d66c", 1600),
  burgerHero: img("photo-1568901346375-23c9450c58cd", 1600),
  waiter: img("photo-1600565193348-f74bd3c7ccdf", 1200),

  margherita: img("photo-1574071318508-1cdbab80d002"),
  pepperoni: img("photo-1628840042765-356cda07504e"),
  pizza1: img("photo-1565299624946-b28f40a0ae38"),
  pizza2: img("photo-1604382354936-07c5d9983bd3"),
  pizza3: img("photo-1593560708920-61dd98c46a4e"),
  pizza4: img("photo-1571407970349-bc81e7e96d47"),
  pizza5: img("photo-1595854341625-f33ee10dbf94"),
  pizza6: img("photo-1576458088443-04a19bb13da6"),
  pizza7: img("photo-1590947132387-155cc02f3212"),
  calzone: img("photo-1536964549204-cce9eab227bd"),

  burger1: img("photo-1568901346375-23c9450c58cd"),
  burger2: img("photo-1550547660-d9450f859349"),
  burger3: img("photo-1571091718767-18b5b1457add"),
  burger4: img("photo-1553979459-d2229ba7433b"),
  burger5: img("photo-1520072959219-c595dc870360"),

  fries: img("photo-1573080496219-bb080dd4f877"),
  garlicBread: img("photo-1619535860434-ba1d8fa12536"),
  caesar: img("photo-1550304943-4f24f54ddde9"),
  mozzarellaSticks: img("photo-1531749668029-2db88e4276c7"),
  dip: img("photo-1472476443507-c7a5948772fc"),

  cola: img("photo-1622483767028-3f66f32aef97"),
  soda: img("photo-1554866585-cd94860890b7"),
  water: img("photo-1523362628745-0c100150b504"),
  beer: img("photo-1608270586620-248524c67de9"),
  wine: img("photo-1510812431401-41d2bd2722f3"),
  shake: img("photo-1572490122747-3968b75cc699"),

  steak: img("photo-1600891964092-4316c288032e"),
  pasta: img("photo-1621996346565-e3dbc646d9a9"),
  fish: img("photo-1519708227418-c8fd9a32b7a2"),
  starter: img("photo-1546039907-7fa05f864c02"),
  dessert: img("photo-1551024601-bec78aea704b"),

  sushi1: img("photo-1579871494447-9811cf80d66c"),
  sushi2: img("photo-1553621042-f6e147245754"),
  sushi3: img("photo-1617196034796-73dfa7b1fd56"),
  sushi4: img("photo-1611143669185-af224c5e3252"),
  edamame: img("photo-1564834724105-918b73d1b9e0"),

  coffee: img("photo-1509042239860-f550ce710b93"),
  latte: img("photo-1461023058943-07fcbe16d735"),
  croissant: img("photo-1555507036-ab1f4038808a"),
  sandwich: img("photo-1528735602780-2552fd46c7af"),
  brunch: img("photo-1533089860892-a7c6f0a88666"),
  cake: img("photo-1578985545062-69928b1d9587"),
};
