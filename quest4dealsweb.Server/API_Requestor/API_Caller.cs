namespace API_Requestor
{
    using System.Net.Http;
    using System.Threading.Tasks;

    public static class ApiCaller
    {
        public static async Task<string> CallApiAsync(string url)
        {
            using var client = new HttpClient();
            var response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync();
        }
    }

}