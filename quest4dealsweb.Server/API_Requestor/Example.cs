using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using API_Requestor;

public class Example
{
    public static async Task Main()
    {
        // Use the Steam Store API endpoint for app details.
        var request = new APIRequest("https://store.steampowered.com/api/appdetails");
        request.AddRequestParameter("appids", "993090");
        request.AddRequestParameter("cc", "us");

        string url = request.BuildUrl();
        Console.WriteLine($"Request URL: {url}");

        try
        {
            // Call the API and parse the JSON response.
            string jsonResponse = await ApiCaller.CallApiAsync(url);
            var parsedJson = JObject.Parse(jsonResponse);
            string formattedJson = JsonConvert.SerializeObject(parsedJson, Formatting.Indented);

            Console.WriteLine("API Response:");
            Console.WriteLine(formattedJson);

            // Extract the name, price, and discount information.
            var data = parsedJson["993090"]?["data"];
            var name = data?["name"];
            var price = data?["price_overview"]?["final_formatted"];
            var percentDiscount = data?["price_overview"]?["discount_percent"];

            if (name != null && price != null && percentDiscount != null)
            {
                Console.WriteLine($"\n\nRAW Price Info: {data?["price_overview"]}");
                Console.WriteLine("\nSteam API Price Info:");
                Console.WriteLine($"Name: {name}");
                Console.WriteLine($"Price: {price}");
                Console.WriteLine($"Discount Percent: {percentDiscount}%");
            }
            else
            {
                Console.WriteLine("Price information is not available.");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
        }
    }
}