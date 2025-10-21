# Робота з Markdown через Markdig в .NET

## Базова конфігурація

Спочатку потрібно встановити пакет Markdig через NuGet:
```bash
dotnet add package Markdig
```

## Приклад базового використання

```csharp
using Markdig;
using Markdig.Syntax;

public class MarkdownProcessor
{
    private readonly MarkdownPipeline _pipeline;

    public MarkdownProcessor()
    {
        // Налаштування пайплайну з усіма розширеннями
        _pipeline = new MarkdownPipelineBuilder()
            .UseAdvancedExtensions()
            .UseBootstrap() // Для Bootstrap класів
            .UseEmojiAndSmiley() // Для емодзі
            .UseMediaLinks() // Для відео посилань
            .Build();
    }

    public string RenderHtml(string markdown)
    {
        return Markdown.ToHtml(markdown, _pipeline);
    }
}
```

## Сегментація контенту по розділах

Для розбиття контенту на розділи можна використовувати парсинг заголовків:

```csharp
public class ContentSegmenter
{
    private readonly MarkdownPipeline _pipeline;

    public ContentSegmenter()
    {
        _pipeline = new MarkdownPipelineBuilder()
            .UseAdvancedExtensions()
            .Build();
    }

    public List<ContentSection> SegmentByHeadings(string markdown)
    {
        var document = Markdown.Parse(markdown, _pipeline);
        var sections = new List<ContentSection>();
        var currentSection = new ContentSection();
        
        foreach (var block in document)
        {
            if (block is HeadingBlock heading)
            {
                // Якщо знайшли новий заголовок, зберігаємо попередню секцію
                if (!string.IsNullOrEmpty(currentSection.Title))
                {
                    sections.Add(currentSection);
                    currentSection = new ContentSection();
                }
                
                currentSection.Title = heading.Inline?.FirstChild?.ToString();
                currentSection.Level = heading.Level;
            }
            else
            {
                // Додаємо контент до поточної секції
                currentSection.Content.Add(block);
            }
        }
        
        // Додаємо останню секцію
        if (!string.IsNullOrEmpty(currentSection.Title))
        {
            sections.Add(currentSection);
        }
        
        return sections;
    }
}

public class ContentSection
{
    public string Title { get; set; }
    public int Level { get; set; }
    public List<Block> Content { get; set; } = new();
}
```

## Обробка медіа контенту

### Відео посилання

```csharp
public class MediaProcessor
{
    private readonly MarkdownPipeline _pipeline;

    public MediaProcessor()
    {
        _pipeline = new MarkdownPipelineBuilder()
            .UseMediaLinks() // Активуємо підтримку медіа посилань
            .Build();
    }

    public string ProcessVideoLinks(string markdown)
    {
        // Кастомний обробник для відео посилань
        var document = Markdown.Parse(markdown, _pipeline);
        
        foreach (var link in document.Descendants<LinkInline>())
        {
            if (IsVideoUrl(link.Url))
            {
                // Конвертуємо посилання у вбудований плеєр
                var videoEmbed = GenerateVideoEmbed(link.Url);
                // Заміняємо посилання на вбудований код
                link.Url = videoEmbed;
            }
        }

        return Markdown.ToHtml(document, _pipeline);
    }

    private bool IsVideoUrl(string url)
    {
        return url?.Contains("youtube.com") == true || 
               url?.Contains("vimeo.com") == true;
    }

    private string GenerateVideoEmbed(string url)
    {
        // Приклад для YouTube
        if (url.Contains("youtube.com"))
        {
            var videoId = ExtractYouTubeId(url);
            return $@"<div class=""video-container"">
                       <iframe width=""560"" height=""315"" 
                               src=""https://www.youtube.com/embed/{videoId}"" 
                               frameborder=""0"" allowfullscreen>
                       </iframe>
                     </div>";
        }
        return url;
    }
}
```

### Обробка зображень

```csharp
public class ImageProcessor
{
    private readonly MarkdownPipeline _pipeline;

    public ImageProcessor()
    {
        _pipeline = new MarkdownPipelineBuilder()
            .UseAdvancedExtensions()
            .Build();
    }

    public string ProcessImages(string markdown)
    {
        var document = Markdown.Parse(markdown, _pipeline);
        
        foreach (var image in document.Descendants<LinkInline>().Where(x => x.IsImage))
        {
            // Додаємо додаткові атрибути до зображення
            image.GetAttributes().AddClass("img-fluid");
            
            // Перевіряємо шлях зображення
            if (!image.Url.StartsWith("http"))
            {
                // Конвертуємо відносний шлях в абсолютний
                image.Url = ConvertToAbsolutePath(image.Url);
            }
            
            // Додаємо обробку помилок завантаження
            image.GetAttributes().AddProperty("onerror", "this.onerror=null;this.src='placeholder.png';");
        }

        return Markdown.ToHtml(document, _pipeline);
    }

    private string ConvertToAbsolutePath(string relativePath)
    {
        // Логіка конвертації відносного шляху в абсолютний
        var baseUrl = "https://your-domain.com/images/";
        return Path.Combine(baseUrl, relativePath).Replace("\\", "/");
    }
}
```

## Повний приклад використання

```csharp
public class MarkdownDocumentProcessor
{
    private readonly ContentSegmenter _segmenter;
    private readonly MediaProcessor _mediaProcessor;
    private readonly ImageProcessor _imageProcessor;

    public MarkdownDocumentProcessor()
    {
        _segmenter = new ContentSegmenter();
        _mediaProcessor = new MediaProcessor();
        _imageProcessor = new ImageProcessor();
    }

    public async Task<ProcessedDocument> ProcessDocumentAsync(string filePath)
    {
        var markdown = await File.ReadAllTextAsync(filePath);
        
        // Розбиваємо на секції
        var sections = _segmenter.SegmentByHeadings(markdown);
        
        // Обробляємо кожну секцію
        foreach (var section in sections)
        {
            var sectionContent = string.Join("\n", section.Content);
            
            // Обробляємо медіа
            sectionContent = _mediaProcessor.ProcessVideoLinks(sectionContent);
            
            // Обробляємо зображення
            sectionContent = _imageProcessor.ProcessImages(sectionContent);
            
            section.ProcessedContent = sectionContent;
        }

        return new ProcessedDocument
        {
            Title = sections.FirstOrDefault()?.Title ?? Path.GetFileNameWithoutExtension(filePath),
            Sections = sections
        };
    }
}

public class ProcessedDocument
{
    public string Title { get; set; }
    public List<ContentSection> Sections { get; set; }
    public Dictionary<string, string> Metadata { get; set; }
}
```

## Рекомендації та найкращі практики

1. **Кешування**:
   - Кешуйте скомпільований HTML для часто використовуваних документів
   - Використовуйте версіонування для інвалідації кешу

2. **Безпека**:
   - Використовуйте `UseAdvancedExtensions().DisableHtml()` для заборони HTML
   - Валідуйте всі зовнішні посилання
   - Використовуйте білий список дозволених доменів для зображень

3. **Продуктивність**:
   - Використовуйте асинхронні операції для завантаження файлів
   - Реалізуйте ліниве завантаження для великих документів
   - Оптимізуйте зображення перед збереженням

4. **Підтримка**:
   - Ведіть лог помилок парсингу
   - Реалізуйте механізм відновлення при помилках
   - Додайте валідацію структури документа

## Специфіка використання для Telegram бота

### Конвертація Markdown в повідомлення Telegram

```csharp
public class TelegramMarkdownProcessor
{
    private readonly MarkdownPipeline _pipeline;
    private readonly string _mediaBasePath;

    public TelegramMarkdownProcessor(string mediaBasePath)
    {
        _mediaBasePath = mediaBasePath;
        _pipeline = new MarkdownPipelineBuilder()
            .UseAdvancedExtensions()
            .DisableHtml() // Для безпеки
            .UseEmphasisExtras() // Для додаткового форматування
            .UseEmojiAndSmiley()
            .Build();
    }

    public async Task<List<BotMessage>> ProcessMarkdownForTelegramAsync(string markdown)
    {
        var messages = new List<BotMessage>();
        var document = Markdown.Parse(markdown, _pipeline);
        var currentTextBlock = new StringBuilder();
        
        foreach (var block in document)
        {
            switch (block)
            {
                case HeadingBlock heading:
                    // Якщо є накопичений текст, додаємо його як повідомлення
                    if (currentTextBlock.Length > 0)
                    {
                        messages.Add(new TextMessage(currentTextBlock.ToString(), ParseMode.MarkdownV2));
                        currentTextBlock.Clear();
                    }
                    
                    // Форматуємо заголовок
                    var headingText = $"*{EscapeMarkdown(heading.Inline?.FirstChild?.ToString())}*\n\n";
                    currentTextBlock.Append(headingText);
                    break;

                case ParagraphBlock paragraph:
                    var text = paragraph.Inline?.FirstChild?.ToString();
                    if (!string.IsNullOrEmpty(text))
                    {
                        currentTextBlock.Append(EscapeMarkdown(text)).Append("\n\n");
                    }
                    break;

                case LinkInline link when link.IsImage:
                    // Якщо є накопичений текст, додаємо його як повідомлення
                    if (currentTextBlock.Length > 0)
                    {
                        messages.Add(new TextMessage(currentTextBlock.ToString(), ParseMode.MarkdownV2));
                        currentTextBlock.Clear();
                    }

                    // Створюємо повідомлення з зображенням
                    var imagePath = Path.Combine(_mediaBasePath, link.Url);
                    messages.Add(new PhotoMessage(link.Title ?? "", imagePath));
                    break;

                case FencedCodeBlock codeBlock:
                    // Якщо є накопичений текст, додаємо його як повідомлення
                    if (currentTextBlock.Length > 0)
                    {
                        messages.Add(new TextMessage(currentTextBlock.ToString(), ParseMode.MarkdownV2));
                        currentTextBlock.Clear();
                    }

                    // Форматуємо код для Telegram
                    var code = $"```{codeBlock.Info}\n{codeBlock.Lines}\n```";
                    messages.Add(new TextMessage(code, ParseMode.MarkdownV2));
                    break;
            }

            // Перевіряємо розмір поточного текстового блоку
            if (currentTextBlock.Length > 3500) // Telegram ліміт ~4096
            {
                messages.Add(new TextMessage(currentTextBlock.ToString(), ParseMode.MarkdownV2));
                currentTextBlock.Clear();
            }
        }

        // Додаємо залишковий текст
        if (currentTextBlock.Length > 0)
        {
            messages.Add(new TextMessage(currentTextBlock.ToString(), ParseMode.MarkdownV2));
        }

        return messages;
    }

    private string EscapeMarkdown(string? text)
    {
        if (string.IsNullOrEmpty(text)) return string.Empty;
        
        // Екрануємо спеціальні символи для MarkdownV2
        return text
            .Replace("_", "\\_")
            .Replace("*", "\\*")
            .Replace("[", "\\[")
            .Replace("]", "\\]")
            .Replace("(", "\\(")
            .Replace(")", "\\)")
            .Replace("~", "\\~")
            .Replace("`", "\\`")
            .Replace(">", "\\>")
            .Replace("#", "\\#")
            .Replace("+", "\\+")
            .Replace("-", "\\-")
            .Replace("=", "\\=")
            .Replace("|", "\\|")
            .Replace(".", "\\.")
            .Replace("!", "\\!");
    }
}

// Моделі повідомлень
public abstract record BotMessage;

public record TextMessage(
    string Text,
    ParseMode ParseMode = ParseMode.MarkdownV2
) : BotMessage;

public record PhotoMessage(
    string Caption,
    string PhotoPath,
    ParseMode ParseMode = ParseMode.MarkdownV2
) : BotMessage;

public enum ParseMode
{
    MarkdownV2,
    HTML,
    Markdown
}
```

### Приклад використання в боті

```csharp
public class LessonHandler
{
    private readonly TelegramMarkdownProcessor _markdownProcessor;
    private readonly ITelegramBotClient _botClient;
    
    public LessonHandler(string mediaBasePath, ITelegramBotClient botClient)
    {
        _markdownProcessor = new TelegramMarkdownProcessor(mediaBasePath);
        _botClient = botClient;
    }
    
    public async Task SendLessonAsync(long chatId, string lessonContent)
    {
        // Обробляємо markdown контент
        var messages = await _markdownProcessor.ProcessMarkdownForTelegramAsync(lessonContent);
        
        // Відправляємо повідомлення
        foreach (var message in messages)
        {
            switch (message)
            {
                case TextMessage textMessage:
                    await _botClient.SendTextMessageAsync(
                        chatId: chatId,
                        text: textMessage.Text,
                        parseMode: textMessage.ParseMode);
                    break;
                    
                case PhotoMessage photoMessage:
                    await using var photoStream = File.OpenRead(photoMessage.PhotoPath);
                    await _botClient.SendPhotoAsync(
                        chatId: chatId,
                        photo: InputFile.FromStream(photoStream),
                        caption: photoMessage.Caption,
                        parseMode: photoMessage.ParseMode);
                    break;
            }
            
            // Додаємо затримку між повідомленнями
            await Task.Delay(TimeSpan.FromMilliseconds(100));
        }
    }
}
```

### Особливості та обмеження для Telegram

1. **Розмір повідомлень**:
   - Максимальний розмір текстового повідомлення: 4096 символів
   - Необхідно розбивати великі тексти на частини

2. **Форматування**:
   - Використовуйте MarkdownV2 для кращої сумісності
   - Обов'язково екрануйте спеціальні символи
   - Підтримуються: `*bold*, _italic_, __underline__, ~strike~, ||spoiler||, `code`, ```pre```, [text](URL)`

3. **Медіа контент**:
   - Фото: максимум 10 МБ
   - Відео: максимум 50 МБ
   - Аудіо: максимум 50 МБ
   - Файли: максимум 50 МБ

4. **Оптимізація**:
   - Використовуйте Media Groups для відправки декількох фото
   - Кешуйте file_id для повторного використання медіа
   - Оптимізуйте зображення перед відправкою

## Корисні розширення Markdig

```csharp
var pipeline = new MarkdownPipelineBuilder()
    .UseAdvancedExtensions()
    .DisableHtml() // Для безпеки в Telegram
    .UseEmojiAndSmiley()
    .UseEmphasisExtras()
    .UseAutoLinks()
    .UseTaskLists()
    .UseCustomContainers()
    .UsePipeTables()
    .Build();
```
