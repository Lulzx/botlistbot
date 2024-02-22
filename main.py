import streamlit as st
import pandas as pd
import orjson

CATEGORY_FILE = 'category.json'
BOT_FILE = 'bot.json'


def load_file(file_path):
    with open(file_path, 'rb') as file:
        data = orjson.loads(file.read())
    return [{k: v if v is not None else '' for k, v in item.items()} for item in data]


def extract_unique_bots(bots_data):
    return list({bot['username']: bot for bot in bots_data}.values())


def filter_bots(bots, category_id, search_term):
    search_term_lower = search_term.lower()
    return [bot for bot in bots if bot["category_id"] == category_id and search_term_lower in get_searchable_text(bot)]


def get_searchable_text(bot):
    return ' '.join([str(bot.get(field, '')) for field in ['name', 'username', 'description']]).lower()


def display_bot_table(filtered_bots):
    bots_sorted = sorted(filtered_bots, key=lambda x: (not x.get('description'), not x.get('name')))
    bot_df = pd.DataFrame(bots_sorted, columns=["name", "username", "description"])
    bot_df.index += 1  # Adjust index to start at 1 for display
    bot_df['username'] = bot_df['username'].apply(lambda x: f'<a href="tg://resolve?domain={x[1:]}" target="_blank">{x}</a>')
    st.write(bot_df.rename(columns=str.capitalize).to_html(escape=False), unsafe_allow_html=True)


def main():
    categories_data = load_file(CATEGORY_FILE)
    bots_data = extract_unique_bots(load_file(BOT_FILE))

    df_categories = pd.DataFrame(categories_data)

    st.sidebar.title("Categories")
    all_categories_option = "All categories"
    category_options = [all_categories_option] + df_categories["name"].tolist()
    selected_category_name = st.sidebar.selectbox("Select a category", category_options)

    st.title(f"{selected_category_name} Bots")

    search_term = st.sidebar.text_input("Search Bots", "").strip()

    if selected_category_name == all_categories_option:
        filtered_bots = [bot for bot in bots_data if search_term.lower() in get_searchable_text(bot)]
    else:
        category_id = df_categories.loc[df_categories["name"] == selected_category_name, "id"].iloc[0]
        filtered_bots = filter_bots(bots_data, category_id, search_term)

    if filtered_bots:
        display_bot_table(filtered_bots)
    else:
        st.write("No bots found.")

if __name__ == "__main__":
    st.set_page_config(page_title="BotList Explorer", layout="wide")
    main()
